import { promisify } from 'util';
import { exec } from 'child_process';
import { promises as fsPromise } from 'fs';
import { BBox, Feature, MultiPolygon, Polygon } from '@turf/helpers';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { IConfig } from 'config';
import { ITileRange, TileRanger } from '@map-colonies/mc-utils';
import { Gpkg } from '../gpkg/gpkg';
import { Services } from '../common/constants';
import { Tile } from '../tiles/tile';
import { getPixelResolution, snapBBoxToTileGrid, tilesCountPerZoom } from '../common/utils';

export class Worker {
  private readonly logger: Logger;
  private readonly config: IConfig;
  private readonly db: Gpkg;
  private readonly batchSize: number;

  public constructor(db: Gpkg) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.db = db;
    this.batchSize = this.config.get<number>('batchSize');
  }

  public async populate(intersection: Feature<Polygon | MultiPolygon>, maxZoomLevel: number, tilesDirectory: string): Promise<void> {
    const tileGroups = new TileRanger().encodeFootprint(intersection, maxZoomLevel);
    const tilesGen = this.tilesGenerator(tileGroups, tilesDirectory);
    await this.handleBatch(tilesGen);
  }

  public async buildOverviews(bbox: BBox, zoomLevel: number): Promise<void> {
    const promiseExec = promisify(exec);

    const resamplingMethod = this.config.get<string>('gpkg.resampling');

    const overviews = this.calculateOverviews(bbox, zoomLevel);
    const command = `gdaladdo  -r ${resamplingMethod} ${this.db.gpkgFullPath} ${overviews.join(' ')}`;

    this.logger.info(`Building overviews with command: ${command}`);
    const { stdout, stderr } = await promiseExec(command);

    if (stderr) {
      throw new Error(stderr);
    }
    if (stdout) {
      this.logger.info(stdout);
    }
  }

  public updateExtent(bbox: BBox, zoomLevel: number): void {
    const extent = snapBBoxToTileGrid(bbox, zoomLevel);

    const sql = `UPDATE gpkg_contents SET min_x = ?, min_y = ?, max_x = ?, max_y = ?`;
    this.db.runStatement(sql, extent);
  }

  private async handleBatch(tileGenerator: AsyncGenerator<Tile>): Promise<void> {
    let tilesBatch: Tile[] = [];

    for await (const tile of tileGenerator) {
      tilesBatch.push(tile);
      if (tilesBatch.length === this.batchSize) {
        this.db.insertTiles(tilesBatch);
        tilesBatch = [];
      }
    }

    this.db.insertTiles(tilesBatch); // Insert left overs of last bulk
  }

  private calculateOverviews(bbox: BBox, zoomLevel: number): number[] {
    const lonDiff = bbox[2] - bbox[0];
    const latDiff = bbox[3] - bbox[1];
    let overviewFactor = 2;
    const overviews: number[] = [];

    // Overviews are built 1 zoom level before the maximum zoom level
    const maxOverviewZoom = zoomLevel - 1;
    let pixelSize = getPixelResolution(maxOverviewZoom);
    let overviewCounter = maxOverviewZoom;

    while (lonDiff >= pixelSize && latDiff >= pixelSize && overviewCounter >= 0) {
      overviews.push(overviewFactor);
      overviewFactor = overviewFactor << 1;
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      pixelSize = pixelSize * 2;
      overviewCounter--;
    }

    return overviews;
  }

  private async *tilesGenerator(rangeGen: Iterable<ITileRange>, tilesDirectory: string): AsyncGenerator<Tile> {
    for (const range of rangeGen) {
      const tilesInZoomLevel = tilesCountPerZoom(range.zoom);
      for (let x = range.minX; x < range.maxX; x++) {
        for (let lowerLeftY = range.minY; lowerLeftY < range.maxY; lowerLeftY++) {
          const upperLeftY = tilesInZoomLevel - lowerLeftY;
          const fileLocation = `${tilesDirectory}/${range.zoom}/${x}/${lowerLeftY}.png`;
          try {
            const blob = await fsPromise.readFile(fileLocation);
            yield { z: range.zoom, x, y: upperLeftY, tileData: blob };
          } catch (err) {
            this.logger.info(`Could not find tile: ${fileLocation}`);
          }
        }
      }
    }
  }
}

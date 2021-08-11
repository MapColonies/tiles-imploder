import { promisify } from 'util';
import { exec } from 'child_process';
import { Feature } from '@turf/helpers';
import { Logger } from '@map-colonies/js-logger';
import { container, injectable } from 'tsyringe';
import { IConfig } from 'config';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { Gpkg } from '../gpkg/gpkg';
import { Services } from '../common/constants';
import { Tile } from '../tiles/tile';
import { TileGenerator } from '../tiles/tilesGenerator';
import { getPixelResolution, snapBBoxToTileGrid } from '../common/utils';

@injectable()
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

  public async populate(features: Feature[], maxZoomLevel: number, tileDirectory: string): Promise<void> {
    for (const feat of features) {
      if (feat.bbox) {
        const firstCoordinate = { lon: feat.bbox[0], lat: feat.bbox[1] };
        const secondCoordinate = { lon: feat.bbox[2], lat: feat.bbox[3] };

        const startTile = Tile.fromULCoordinate(firstCoordinate, maxZoomLevel);
        const endTile = Tile.fromULCoordinate(secondCoordinate, maxZoomLevel);
        const generator = new TileGenerator(startTile, endTile, tileDirectory).generator;
        await this.handleBatch(generator);
      } else {
        throw new Error(`Could not populate GPKG with feature ${JSON.stringify(feat)} - no BBOX supplied`);
      }
    }
  }

  public async buildOverviews(bbox: BBox2d, zoomLevel: number): Promise<void> {
    const promiseExec = promisify(exec);

    const resamplingMethod = this.config.get<string>('gpkg.resampling');

    const overviews = this.calculateOverviews(bbox, zoomLevel);
    const command = `gdaladdo  -r ${resamplingMethod} ${this.db.path} ${overviews.join(' ')}`;

    this.logger.info(`Building overviews with command: ${command}`);
    const { stdout, stderr } = await promiseExec(command);

    if (stderr) {
      throw new Error(stderr);
    }
    if (stdout) {
      this.logger.info(stdout);
    }
  }

  public updateExtent(bbox: BBox2d, zoomLevel: number): void {
    const extent = snapBBoxToTileGrid(bbox, zoomLevel);

    const sql = `UPDATE gpkg_contents SET min_x = ?, min_y = ?, max_x = ?, max_y = ?`;
    this.db.runStatement(sql, extent);
  }

  private async handleBatch(tileGenerator: AsyncGenerator<Tile>): Promise<void> {
    let tilesBatch: Tile[] = [];

    for await (const currentTile of tileGenerator) {
      tilesBatch.push(currentTile);
      if (tilesBatch.length === this.batchSize) {
        this.db.insertTiles(tilesBatch);
        tilesBatch = [];
      }
    }

    this.db.insertTiles(tilesBatch); // Insert left overs of last bulk
  }

  private calculateOverviews(bbox: BBox2d, zoomLevel: number): number[] {
    const lonDiff = bbox[2] - bbox[0];
    const latDiff = bbox[3] - bbox[1];

    let overviewFactor = 2;
    const overviews: number[] = [];

    // Overviews are built 1 zoom level before the maximum zoom level
    let maxOverviewZoom = zoomLevel - 1;
    let pixelSize = getPixelResolution(maxOverviewZoom);

    while (lonDiff >= pixelSize && latDiff >= pixelSize) {
      overviews.push(overviewFactor);
      overviewFactor = overviewFactor << 1;
      pixelSize = pixelSize * 2;
    }

    return overviews;
  }
}

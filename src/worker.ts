import { promisify } from 'util';
import { exec } from 'child_process';
import { Feature } from '@turf/helpers';
import { Logger } from '@map-colonies/js-logger';
import { container, injectable } from 'tsyringe';
import { IConfig } from 'config';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { Gpkg } from './gpkg';
import { Services } from './common/constants';
import { Tile } from './tile';
import { TileGenerator } from './tilesGenerator';
import { getPixelResolution, snapBBoxToTileGrid } from './common/utils';

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
    this.batchSize = this.config.get<number>('batch.size');
  }

  public async populate(features: Feature[], maxZoomLevel: number): Promise<void> {
    for (const feat of features) {
      if (feat.bbox) {
        const firstCoordinate = { lon: feat.bbox[0], lat: feat.bbox[1] };
        const secondCoordinate = { lon: feat.bbox[2], lat: feat.bbox[3] };

        const startTile = Tile.fromULCoordinate(firstCoordinate, maxZoomLevel);
        const endTile = Tile.fromULCoordinate(secondCoordinate, maxZoomLevel);
        const generator = new TileGenerator(startTile, endTile).generator;
        await this.handleBatch(generator);
      } else {
        throw new Error(`Could not populate GPKG with feature ${JSON.stringify(feat)} - no BBOX supplied`);
      }
    }
  }

  public async buildOverviews(bbox: BBox2d, zoomLevel: number): Promise<void> {
    const promiseExec = promisify(exec);
    const gpkgPath = this.config.get<string>('gpkg.path');
    const gpkgName = this.config.get<string>('gpkg.name');
    const gpkgFullPath = `${gpkgPath}/${gpkgName}.gpkg`;

    const resamplingMethod = this.config.get<string>('gpkg.resampling');

    const overviews = this.calculateOverviews(bbox, zoomLevel);
    const command = `gdaladdo  -r ${resamplingMethod} ${gpkgFullPath} ${overviews.join(' ')}`;

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
    let pixelSize: number;
    const overviews: number[] = [];

    do {
      pixelSize = getPixelResolution(zoomLevel);
      overviews.push(overviewFactor);
      overviewFactor = overviewFactor << 1;
      zoomLevel--;
    } while (lonDiff / pixelSize >= 1 && latDiff / pixelSize >= 1);

    overviews.pop();
    return overviews;
  }
}

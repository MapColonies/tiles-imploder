import { Logger } from '@map-colonies/js-logger';
import { BBox2d, Feature } from '@turf/helpers/dist/js/lib/geojson';
import { IConfig } from 'config';
import { container } from 'tsyringe';
import polygonToBBox from '@turf/bbox';
import { Services } from './common/constants';
import { IGpkgConfig, IInput } from './common/interfaces';
import { GeoHash } from './geohash/geohash';
import { Gpkg } from './gpkg/gpkg';
import { Worker } from './worker/worker';
import { intersect } from './common/utils';

export class MainLoop {
  private readonly config: IConfig;
  private readonly logger: Logger;
  private db?: Gpkg;
  private worker?: Worker;
  private readonly geohash: GeoHash;
  private readonly input: IInput;
  private readonly gpkgConfig: IGpkgConfig;

  public constructor(input: IInput) {
    this.config = container.resolve(Services.CONFIG);
    this.logger = container.resolve(Services.LOGGER);
    this.geohash = new GeoHash();
    this.input = input;
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
  }

  public async run(): Promise<void> {
    const gpkgFullPath = `${this.gpkgConfig.path}/${this.input.packageName}.gpkg`;

    const intersection = intersect(this.input.footprint, this.input.bbox);
    const features: Feature[] = (await this.geohash.geojson2geohash(intersection)).map((geohash: string) => this.geohash.decode(geohash));
    const intersectionBbox: BBox2d = polygonToBBox(intersection) as BBox2d;

    this.db = new Gpkg(gpkgFullPath, intersectionBbox, this.input.zoomLevel, this.input.packageName);

    this.logger.info(`Creating new GPKG`);
    this.worker = new Worker(this.db);

    this.logger.info(`Updating DB extents`);
    this.worker.updateExtent(intersectionBbox, this.input.zoomLevel);
    this.logger.info(`Populating ${gpkgFullPath} with bbox ${JSON.stringify(this.input.bbox)} until zoom level ${this.input.zoomLevel}`);
    await this.worker.populate(features, this.input.zoomLevel, this.input.tilesFullPath);

    this.logger.info(`Building overviews in ${gpkgFullPath}`);
    await this.worker.buildOverviews(intersectionBbox, this.input.zoomLevel);
  }
}

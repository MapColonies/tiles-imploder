import { Logger } from '@map-colonies/js-logger';
import { BBox2d, Feature } from '@turf/helpers/dist/js/lib/geojson';
import { IConfig } from 'config';
import { container } from 'tsyringe';
import polygonToBBox from '@turf/bbox';
import { Services } from './common/constants';
import { IInput } from './common/interfaces';
import { GeoHash } from './geohash/geohash';
import { Gpkg } from './gpkg';
import { Worker } from './worker';
import { intersect } from './common/utils';

export class MainLoop {
  private readonly config: IConfig;
  private readonly logger: Logger;
  private readonly db: Gpkg;
  private readonly worker: Worker;
  private readonly geohash: GeoHash;
  private readonly input: IInput;

  public constructor(input: IInput) {
    this.config = container.resolve(Services.CONFIG);
    this.logger = container.resolve(Services.LOGGER);
    this.db = container.resolve(Services.DB);
    this.worker = container.resolve(Services.WORKER);
    this.geohash = container.resolve(Services.GEOHASH);
    this.input = input;
  }

  public async run(): Promise<void> {
    const gpkgPath = this.config.get<string>('gpkg.path');
    const gpkgName = this.config.get<string>('gpkg.name');
    const gpkgFullPath = `${gpkgPath}/${gpkgName}.gpkg`;

    const intersection = intersect(this.input.footprint, this.input.bbox);
    const features: Feature[] = (await this.geohash.geojson2geohash(intersection)).map((geohash: string) => this.geohash.decode(geohash));
    const intersectionBbox: BBox2d = polygonToBBox(intersection) as BBox2d;

    this.logger.info(`Updating DB extents`);
    this.worker.updateExtent(intersectionBbox, this.input.zoomLevel);

    this.logger.info(`Populating ${gpkgFullPath} with bbox ${JSON.stringify(this.input.bbox)} until zoom level ${this.input.zoomLevel}`);
    await this.worker.populate(features, this.input.zoomLevel);

    this.logger.info(`Building overviews in ${gpkgFullPath}`);
    await this.worker.buildOverviews(intersectionBbox, this.input.zoomLevel);
  }
}

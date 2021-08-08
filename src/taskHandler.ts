import { promises as fsPromise } from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { BBox2d, Feature } from '@turf/helpers/dist/js/lib/geojson';
import { IConfig } from 'config';
import { inject, singleton } from 'tsyringe';
import polygonToBBox from '@turf/bbox';
import { Services } from './common/constants';
import { IGpkgConfig, IInput } from './common/interfaces';
import { GeoHash } from './geohash/geohash';
import { Gpkg } from './gpkg/gpkg';
import { Worker } from './worker/worker';
import { intersect } from './common/utils';
import { CallbackClient } from './clients/callbackClient';
import { JobsClient } from './clients/jobsClient';

@singleton()
export class TaskHandler {
  private readonly geohash: GeoHash;
  private readonly gpkgConfig: IGpkgConfig;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly callbackClient: CallbackClient,
    private readonly jobClient: JobsClient
  ) {
    this.geohash = new GeoHash();
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
  }

  public async run(input: IInput): Promise<void> {
    const gpkgFullPath = `${this.gpkgConfig.path}/${input.packageName}.gpkg`;

    const intersection = intersect(input.footprint, input.bbox);
    const features: Feature[] = (await this.geohash.geojson2geohash(intersection)).map((geohash: string) => this.geohash.decode(geohash));
    const intersectionBbox: BBox2d = polygonToBBox(intersection) as BBox2d;

    const db = new Gpkg(gpkgFullPath, intersectionBbox, input.zoomLevel, input.packageName);

    this.logger.info(`Creating new GPKG`);
    const worker = new Worker(db);

    this.logger.info(`Updating DB extents`);
    worker.updateExtent(intersectionBbox, input.zoomLevel);
    this.logger.info(`Populating ${gpkgFullPath} with bbox ${JSON.stringify(input.bbox)} until zoom level ${input.zoomLevel}`);
    await worker.populate(features, input.zoomLevel, input.tilesFullPath);

    this.logger.info(`Building overviews in ${gpkgFullPath}`);
    await worker.buildOverviews(intersectionBbox, input.zoomLevel);

    this.logger.info(`Get Job Params for: ${input.jobId}`);
    const jobData = await this.jobClient.getJob(input.jobId);
    const targetResolution = jobData?.targetResolution;

    this.logger.info(`Making request to URL: ${input.callbackURL}`);
    const dbPath = db.path;
    const fileSize = await this.getFileSizeInMB(dbPath);
    await this.callbackClient.sendCallback(input.callbackURL, dbPath, input.expirationTime, fileSize, input, targetResolution);
  }

  private async getFileSizeInMB(path: string): Promise<number> {
    const megaByteInBytes = 1048576; // 1024 * 1024
    const fileSizeInBytes = (await fsPromise.stat(path)).size;
    return fileSizeInBytes / megaByteInBytes;
  }
}

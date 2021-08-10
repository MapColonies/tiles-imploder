import { promises as fsPromise } from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { BBox2d, Feature } from '@turf/helpers/dist/js/lib/geojson';
import { IConfig } from 'config';
import { inject, singleton } from 'tsyringe';
import polygonToBBox from '@turf/bbox';
import { Services } from './common/constants';
import { IGpkgConfig, IInput, IJobData } from './common/interfaces';
import { GeoHash } from './geohash/geohash';
import { Gpkg } from './gpkg/gpkg';
import { Worker } from './worker/worker';
import { intersect } from './common/utils';
import { CallbackClient } from './clients/callbackClient';
import { QueueClient } from './clients/queueClient';

@singleton()
export class TaskHandler {
  private readonly geohash: GeoHash;
  private readonly gpkgConfig: IGpkgConfig;
  private readonly downloadServerUrl: string;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly callbackClient: CallbackClient,
    private readonly queueClient: QueueClient
  ) {
    this.geohash = new GeoHash();
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
    this.downloadServerUrl = this.config.get<string>('downloadServerUrl');
  }

  public async run(input: IInput): Promise<void> {
    const gpkgFullPath = this.getGPKGPath90(input.packageName);

    const intersection = intersect(input.footprint, input.bbox);
    const features: Feature[] = (await this.geohash.geojson2geohash(intersection)).map((geohash: string) => this.geohash.decode(geohash));
    const intersectionBbox: BBox2d = polygonToBBox(intersection) as BBox2d;

    const db = new Gpkg(gpkgFullPath, intersectionBbox, input.zoomLevel, input.packageName);

    this.logger.info(`Creating new GPKG ${JSON.stringify(input)}`);
    const worker = new Worker(db);

    this.logger.info(`Updating DB extents ${JSON.stringify(input)}`);
    worker.updateExtent(intersectionBbox, input.zoomLevel);
    this.logger.info(`Populating ${gpkgFullPath} with bbox ${JSON.stringify(input.bbox)} until zoom level ${input.zoomLevel}`);
    await worker.populate(features, input.zoomLevel, input.tilesFullPath);

    this.logger.info(`Building overviews in ${gpkgFullPath}`);
    await worker.buildOverviews(intersectionBbox, input.zoomLevel);
  }

  public async sendCallback(input: IInput, errorReason?: string): Promise<void> {
    try {
      const gpkgFullPath = this.getGPKGPath90(input.packageName);

      this.logger.info(`Get Job Params for: ${input.jobId}`);
      const jobData = await this.queueClient.queueHandler.jobManagerClient.getJob(input.jobId);
      const jobParameters = jobData?.parameters as IJobData;
      const targetResolution = jobParameters.targetResolution;
      const success = errorReason === undefined;
      let fileSize = 0;
      if (success) {
        fileSize = await this.getFileSizeInMB(gpkgFullPath);
      }

      const downloadUrl = `${this.downloadServerUrl}/${input.packageName}.gpkg`;

      await this.callbackClient.sendCallback(
        input.callbackURL,
        downloadUrl,
        input.expirationTime,
        fileSize,
        input,
        success,
        targetResolution,
        errorReason
      );
    } catch (error) {
      this.logger.error(`failed to send callback to ${input.callbackURL}, error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    }
  }

  private async getFileSizeInMB(path: string): Promise<number> {
    const megaByteInBytes = 1048576; // 1024 * 1024
    const fileSizeInBytes = (await fsPromise.stat(path)).size;
    return fileSizeInBytes / megaByteInBytes;
  }

  private getGPKGPath90(packageName: string): string {
    const gpkgFullPath = `${this.gpkgConfig.path}/${packageName}.gpkg`;
    return gpkgFullPath;
  }
}

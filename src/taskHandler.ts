import { promises as fsPromise } from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { BBox2d, Feature } from '@turf/helpers/dist/js/lib/geojson';
import { IConfig } from 'config';
import { inject, singleton } from 'tsyringe';
import polygonToBBox from '@turf/bbox';
import { Services } from './common/constants';
import { ICallbackResponse, IGpkgConfig, IInput } from './common/interfaces';
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
  private readonly downloadServerUrl: string;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly callbackClient: CallbackClient,
    private readonly jobClient: JobsClient
  ) {
    this.geohash = new GeoHash();
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
    this.downloadServerUrl = this.config.get<string>('downloadServerUrl');
  }

  public async run(input: IInput): Promise<void> {
    const gpkgFullPath = this.getGPKGPath(input.packageName);

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
      const gpkgFullPath = this.getGPKGPath(input.packageName);
      this.logger.info(`Get Job Params for: ${input.jobId}`);
      const targetResolution = (await this.jobClient.getJob(input.jobId)).parameters.targetResolution;
      const success = errorReason === undefined;
      let fileSize = 0;
      if (success) {
        fileSize = await this.getFileSize(gpkgFullPath);
      }

      const fileUri = `${this.downloadServerUrl}/${input.packageName}.gpkg`;
      const callbackParams: ICallbackResponse = {
        fileUri,
        expirationTime: input.expirationTime,
        fileSize,
        dbId: input.dbId,
        packageName: input.packageName,
        bbox: input.bbox,
        targetResolution,
        requestId: input.jobId,
        success,
        errorReason,
      };

      await this.callbackClient.send(input.callbackURL, callbackParams);
    } catch (error) {
      this.logger.error(`Failed to send callback to ${input.callbackURL}, error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    }
  }

  private async getFileSize(path: string): Promise<number> {
    const fileSizeInBytes = (await fsPromise.stat(path)).size;
    return Math.trunc(fileSizeInBytes); // Make sure we return an Integer
  }

  private getGPKGPath(packageName: string): string {
    const gpkgFullPath = `${this.gpkgConfig.path}/${packageName}.gpkg`;
    return gpkgFullPath;
  }
}

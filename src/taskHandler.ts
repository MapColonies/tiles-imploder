import { promises as fsPromise } from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { IConfig } from 'config';
import { inject, singleton } from 'tsyringe';
import polygonToBBox from '@turf/bbox';
import { BBox } from '@turf/helpers';
import { Services } from './common/constants';
import { ICallbackResponse, IGpkgConfig, IInput } from './common/interfaces/interfaces';
import { Gpkg } from './gpkg/gpkg';
import { Worker } from './worker/worker';
import { intersect } from './common/utils';
import { CallbackClient } from './clients/callbackClient';

@singleton()
export class TaskHandler {
  private readonly gpkgConfig: IGpkgConfig;
  private readonly downloadServerUrl: string;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly callbackClient: CallbackClient
  ) {
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
    this.downloadServerUrl = this.config.get<string>('downloadServerUrl');
  }

  public async run(input: IInput): Promise<void> {
    const gpkgFullPath = this.getGPKGPath(input.packageName);

    const intersection = intersect(input.footprint, input.bbox);
    const intersectionBbox: BBox = polygonToBBox(intersection);

    const db = new Gpkg(gpkgFullPath, intersectionBbox, input.zoomLevel, input.packageName);

    this.logger.info(`Creating new GPKG ${JSON.stringify(input)}`);
    const worker = new Worker(db);

    this.logger.info(`Updating DB extents ${JSON.stringify(input)}`);
    worker.updateExtent(intersectionBbox, input.zoomLevel);
    this.logger.info(`Populating ${gpkgFullPath} with bbox ${JSON.stringify(input.bbox)} until zoom level ${input.zoomLevel}`);
    await worker.populate(intersection, input.zoomLevel, input.tilesPath);

    this.logger.info(`Building overviews in ${gpkgFullPath}`);
    await worker.buildOverviews(intersectionBbox, input.zoomLevel);
  }

  public async sendCallbacks(
    input: IInput,
    targetResolution: number,
    expirationDate: Date,
    callbackURLs: string[],
    errorReason?: string
  ): Promise<ICallbackResponse | undefined> {
    try {
      const gpkgFullPath = this.getGPKGPath(input.packageName);
      const success = errorReason === undefined;
      let fileSize = 0;
      if (success) {
        fileSize = await this.getFileSize(gpkgFullPath);
      }

      const fileUri = `${this.downloadServerUrl}/${input.packageName}.gpkg`;
      const callbackParams: ICallbackResponse = {
        fileUri,
        expirationTime: expirationDate,
        fileSize,
        dbId: input.dbId,
        packageName: input.packageName,
        bbox: input.bbox,
        targetResolution,
        requestId: input.jobId,
        success,
        errorReason,
      };

      const callbackPromises: Promise<void>[] = [];
      for (const url of callbackURLs) {
        callbackPromises.push(this.callbackClient.send(url, callbackParams));
      }

      const promisesResponse = await Promise.allSettled(callbackPromises);
      promisesResponse.forEach((response, index) => {
        if (response.status === 'rejected') {
          this.logger.error(`Failed not send callback to ${callbackURLs[index]}, got error: ${JSON.stringify(response.reason)}`);
        }
      });

      return callbackParams;
    } catch (error) {
      this.logger.error(`Sending callbacks has failed with error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
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

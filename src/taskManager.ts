import { join } from 'path';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { MultiPolygon, Polygon } from '@turf/helpers/dist/js/lib/geojson';
import { IUpdateJobRequestPayload, TaskStatus } from '@map-colonies/mc-priority-queue';
import { IConfig, IInput, IQueueConfig, ITaskParameters } from './common/interfaces';
import { TaskHandler } from './taskHandler';
import { FULL_PRECENTAGE, Services } from './common/constants';
import { QueueClient } from './clients/queueClient';

@singleton()
export class TaskManager {
  private readonly maxAttempts: number;
  private readonly tilesDirectoryPath: string;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig,
    private readonly queueClient: QueueClient,
    private readonly taskHandler: TaskHandler
  ) {
    this.logger = logger;
    this.maxAttempts = config.get<number>('maxAttempts');
    this.tilesDirectoryPath = config.get<string>('tilesDirectoryPath');
  }

  public async work(): Promise<void> {
    const data = await this.queueClient.queueHandler.waitForTask();
    if (data) {
      const attempts = data.attempts;
      const jobId = data.jobId;
      const taskId = data.id;
      const parameters = data.parameters as ITaskParameters;

      const input: IInput = {
        jobId,
        footprint: JSON.parse(parameters.footprint) as Polygon | MultiPolygon,
        bbox: parameters.bbox,
        zoomLevel: parameters.zoomLevel,
        tilesFullPath: join(this.tilesDirectoryPath, parameters.tilesPath),
        packageName: parameters.packageName,
        callbackURL: parameters.callbackURL,
        expirationTime: parameters.expirationTime,
        dbId: parameters.dbId,
      };

      try {
        await this.taskHandler.run(input);
        this.logger.info(`Succesfully populated GPKG for jobId=${jobId}, taskId=${taskId} with tiles`);
        await this.taskHandler.sendCallback(input);
        this.logger.info(`Call task ack jobId=${jobId}, taskId=${taskId}`);
        await this.queueClient.queueHandler.ack(data.jobId, data.id);
        await this.finishJob(data.jobId);
      } catch (error) {
        if (attempts >= this.maxAttempts) {
          await this.queueClient.queueHandler.reject(jobId, taskId, false);
          await this.taskHandler.sendCallback(input, (error as Error).message);
          await this.finishJob(data.jobId, false, (error as Error).message);
        } else {
          await this.queueClient.queueHandler.reject(jobId, taskId, true, (error as Error).message);
          this.logger.error(`Error: jobId=${jobId}, taskId=${taskId}, ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
        }
      }
    }
  }

  public async finishJob(jobId: string, isSuccess = true, errorReason: string | undefined = undefined): Promise<void> {
    this.logger.info(`Update Job status to success=${String(isSuccess)} jobId=${jobId}`);
    const joUpdatePayload: IUpdateJobRequestPayload = {
      status: isSuccess ? TaskStatus.COMPLETED : TaskStatus.FAILED,
      percentage: isSuccess ? FULL_PRECENTAGE : undefined,
      reason: errorReason,
    };
    await this.queueClient.queueHandler.jobManagerClient.updateJob(jobId, joUpdatePayload);
  }
}

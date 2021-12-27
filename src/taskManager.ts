import { join } from 'path';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { IConfig, IInput, IQueueConfig } from './common/interfaces/interfaces';
import { TaskHandler } from './taskHandler';
import { FULL_PRECENTAGE, JobStatus, Services } from './common/constants';
import { QueueClient } from './clients/queueClient';
import { ITaskParameters } from './common/interfaces/tasks';
import { JobManagerClient } from './clients/jobManagerClient';

@singleton()
export class TaskManager {
  private readonly maxAttempts: number;
  private readonly tilesDirectoryPath: string;
  private readonly expirationDate: number;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig,
    private readonly queueClient: QueueClient,
    private readonly taskHandler: TaskHandler,
    private readonly jobManagerClient: JobManagerClient
  ) {
    this.logger = logger;
    this.maxAttempts = config.get<number>('maxAttempts');
    this.tilesDirectoryPath = config.get<string>('tilesDirectoryPath');
    this.expirationDate = config.get<number>('queue.expirationDate');
  }

  public async work(): Promise<void> {
    const data = await this.queueClient.queueHandler.waitForTask();
    if (data) {
      const { attempts, jobId, id: taskId, parameters } = <{ attempts: number; jobId: string; id: string; parameters: ITaskParameters }>data;

      const input: IInput = {
        jobId,
        footprint: parameters.footprint,
        bbox: parameters.bbox,
        zoomLevel: parameters.zoomLevel,
        tilesPath: join(this.tilesDirectoryPath, parameters.tilesPath),
        packageName: parameters.packageName,
        callbackURL: parameters.callbackURL,
        dbId: parameters.dbId,
      };

      try {
        await this.taskHandler.run(input);
        this.logger.info(`Succesfully populated GPKG for jobId=${jobId}, taskId=${taskId} with tiles`);
        await this.finalizeJob(input);
        this.logger.info(`Call task ack jobId=${jobId}, taskId=${taskId}`);
        await this.queueClient.queueHandler.ack(jobId, taskId);
      } catch (error) {
        if (attempts >= this.maxAttempts) {
          await this.queueClient.queueHandler.reject(jobId, taskId, false);
          await this.finalizeJob(input, false, (error as Error).message);
        } else {
          await this.queueClient.queueHandler.reject(jobId, taskId, true, (error as Error).message);
          this.logger.error(`Error: jobId=${jobId}, taskId=${taskId}, ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
        }
      }
    }
  }

  private async finalizeJob(input: IInput, isSuccess = true, reason?: string): Promise<void> {
    this.logger.debug(`Getting job with id ${input.jobId}`);
    const jobData = await this.jobManagerClient.getJob(input.jobId);
    const callbackParams = await this.taskHandler.sendCallback(
      input,
      jobData.parameters.targetResolution,
      jobData.expirationDate,
      jobData.parameters.callbackURL,
      reason
    );

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDate);

    const updateJobParams = {
      status: isSuccess ? JobStatus.COMPLETED : JobStatus.FAILED,
      reason,
      percentage: isSuccess ? FULL_PRECENTAGE : undefined,
      expirationDate,
      parameters: { ...jobData.parameters, callbackParams },
    };

    this.logger.info(`Update Job status to success=${String(isSuccess)} jobId=${input.jobId}`);
    await this.jobManagerClient.updateJob(input.jobId, updateJobParams);
  }
}

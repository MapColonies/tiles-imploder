import { join } from 'path';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { IUpdateJobBody, OperationStatus } from '@map-colonies/mc-priority-queue';
import { IConfig, IInput, IJobParameters, ITaskParameters } from './common/interfaces/interfaces';
import { TaskHandler } from './taskHandler';
import { FULL_PRECENTAGE, Services } from './common/constants';
import { QueueClient } from './clients/queueClient';
import { JobManagerClient } from './clients/jobManagerClient';

@singleton()
export class TaskManager {
  private readonly maxAttempts: number;
  private readonly tilesDirectoryPath: string;
  private readonly expirationDate: number;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly queueClient: QueueClient,
    private readonly taskHandler: TaskHandler,
    private readonly jobManagerClient: JobManagerClient
  ) {
    this.logger = logger;
    this.maxAttempts = this.config.get<number>('maxAttempts');
    this.tilesDirectoryPath = this.config.get<string>('tilesDirectoryPath');
    this.expirationDate = this.config.get<number>('queue.expirationDate');
  }

  public async work(): Promise<void> {
    const data = await this.queueClient.queueHandler.waitForTask<ITaskParameters>();
    if (data) {
      const { attempts, id: taskId, parameters } = data;
      const jobId = data.jobId as string;

      const input: IInput = {
        jobId: jobId,
        footprint: parameters.footprint,
        bbox: parameters.bbox,
        zoomLevel: parameters.zoomLevel,
        tilesPath: join(this.tilesDirectoryPath, parameters.tilesPath),
        packageName: parameters.packageName,
        callbackURLs: parameters.callbackURLs,
        dbId: parameters.dbId,
      };

      try {
        await this.taskHandler.run(input);
        this.logger.info(`Call task ack jobId=${jobId}, taskId=${taskId}`);
        await this.queueClient.queueHandler.ack<ITaskParameters>(jobId, taskId);
        await this.finalizeJob(input);
      } catch (error) {
        if (attempts >= this.maxAttempts) {
          await this.queueClient.queueHandler.reject<ITaskParameters>(jobId, taskId, false);
          await this.finalizeJob(input, false, (error as Error).message);
        } else {
          await this.queueClient.queueHandler.reject<ITaskParameters>(jobId, taskId, true, (error as Error).message);
          this.logger.error(`Error: jobId=${jobId}, taskId=${taskId}, ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
        }
      }
    }
  }

  private async finalizeJob(input: IInput, isSuccess = true, reason?: string): Promise<void> {
    const jobData = await this.jobManagerClient.getJob(input.jobId);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.expirationDate);

    const callbackParams = await this.taskHandler.sendCallbacks(
      input,
      jobData.parameters.targetResolution,
      expirationDate,
      jobData.parameters.callbackURLs,
      reason
    );

    const updateJobParams: IUpdateJobBody<IJobParameters> = {
      status: isSuccess ? OperationStatus.COMPLETED : OperationStatus.FAILED,
      reason,
      percentage: isSuccess ? FULL_PRECENTAGE : undefined,
      expirationDate,
      parameters: { ...jobData.parameters, callbackParams },
    };

    this.logger.info(`Update Job status to success=${String(isSuccess)} jobId=${input.jobId}`);
    await this.jobManagerClient.updateJob(input.jobId, updateJobParams);
  }
}

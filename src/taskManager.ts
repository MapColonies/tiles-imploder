import { join } from 'path';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { MultiPolygon, Polygon } from '@turf/helpers/dist/js/lib/geojson';
import { TaskHandler as QueueHandler } from '@map-colonies/mc-priority-queue';
import { IConfig, IInput, IQueueConfig, ITaskParameters } from './common/interfaces';
import { TaskHandler } from './taskHandler';
import { MaxAttemptsError } from './common/errors';
import { Services } from './common/constants';

@singleton()
export class TaskManager {
  private readonly queueHandler: QueueHandler;
  private readonly maxAttempts: number;
  private readonly tilesDirectoryPath: string;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig,
    private readonly taskHandler: TaskHandler
  ) {
    this.logger = logger;
    this.maxAttempts = config.get<number>('maxAttempts');
    this.tilesDirectoryPath = config.get<string>('tilesDirectoryPath');
    this.queueHandler = new QueueHandler(
      logger,
      this.queueConfig.jobType,
      this.queueConfig.taskType,
      this.queueConfig.jobManagerBaseUrl,
      this.queueConfig.heartbeatManagerBaseUrl,
      this.queueConfig.dequeueIntervalMs,
      this.queueConfig.heartbeatIntervalMs
    );
  }

  public async work(): Promise<void> {
    const data = await this.queueHandler.waitForTask();
    if (data) {
      const attempts = data.attempts;
      const jobId = data.jobId;
      const taskId = data.id;
      const parameters = data.parameters as ITaskParameters;

      try {
        if (attempts >= this.maxAttempts) {
          throw new MaxAttemptsError('reached max attempts');
        }

        const input: IInput = {
          jobId,
          footprint: JSON.parse(parameters.footprint) as Polygon | MultiPolygon,
          bbox: parameters.bbox,
          zoomLevel: parameters.zoomLevel,
          tilesFullPath: join(this.tilesDirectoryPath, parameters.tilesPath),
          packageName: parameters.packageName,
          callbackURL: parameters.callbackURL,
          expirationTime: parameters.expirationTime,
        };

        await this.taskHandler.run(input);
        this.logger.info(`Succesfully populated GPKG for jobId=${jobId}, taskId=${taskId} with tiles`);
        void this.queueHandler.ack(data.jobId, data.id);
      } catch (error) {
        if (error instanceof MaxAttemptsError) {
          await this.queueHandler.reject(jobId, taskId, false);
        } else {
          await this.queueHandler.reject(jobId, taskId, true, (error as Error).message);
          this.logger.error(`Error: jobId=${jobId}, taskId=${taskId}, ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
        }
      }
    }
  }
}

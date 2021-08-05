import { join } from 'path';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { MultiPolygon, Polygon } from '@turf/helpers/dist/js/lib/geojson';
import { TaskHandler } from '@map-colonies/mc-priority-queue';
import { IConfig, IInput, IQueueConfig, ITaskParameters } from './common/interfaces';
import { MainLoop } from './mainLoop';
import { hasMaxAttemps } from './common/utils';
import { MaxAttemptsError } from './common/errors';
import { Services } from './common/constants';

@singleton()
export class Handler {
  private readonly taskHandler: TaskHandler;
  private readonly maxAttempts: number;
  private readonly tilesDirectoryPath: string;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig
  ) {
    this.logger = logger;
    this.maxAttempts = config.get<number>('maxAttempts');
    this.tilesDirectoryPath = config.get<string>('tilesDirectoryPath');
    this.taskHandler = new TaskHandler(
      logger,
      this.queueConfig.jobType,
      this.queueConfig.taskType,
      this.queueConfig.jobManagerBaseUrl,
      this.queueConfig.heartbeatManagerBaseUrl,
      this.queueConfig.dequeueIntervalMs,
      this.queueConfig.heartbeatIntervalMs
    );
  }

  public async handleTask(): Promise<void> {
    const data = await this.taskHandler.waitForTask();
    if (data) {
      const attempts = data.attempts;
      const jobId = data.jobId;
      const taskId = data.id;
      const parameters = data.parameters as ITaskParameters;

      try {
        if (hasMaxAttemps(attempts)) {
          throw new MaxAttemptsError('reached max attempts');
        }

        const input: IInput = {
          footprint: JSON.parse(parameters.footprint) as Polygon | MultiPolygon,
          bbox: parameters.bbox,
          zoomLevel: parameters.zoomLevel,
          tilesFullPath: join(this.tilesDirectoryPath, parameters.tilesPath),
          packageName: parameters.packageName,
        };

        const mainLoop = new MainLoop(input);
        await mainLoop.run();
        this.logger.info(`Succesfully populated GPKG for jobId=${jobId}, taskId=${taskId} with tiles`);
        void this.taskHandler.ack(data.jobId, data.id);
      } catch (error) {
        if (error instanceof MaxAttemptsError) {
          await this.taskHandler.reject(jobId, taskId, false);
        } else {
          await this.taskHandler.reject(jobId, taskId, true, (error as Error).message);
          this.logger.error(`Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
        }
      }
    }
  }
}

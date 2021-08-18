import { TaskHandler as QueueHandler } from '@map-colonies/mc-priority-queue';
import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { IQueueConfig } from '../common/interfaces';
import { Services } from '../common/constants';

@singleton()
export class QueueClient {
  public readonly queueHandler: QueueHandler;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: Logger,
    @inject(Services.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig
  ) {
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
}

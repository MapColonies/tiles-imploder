import { inject, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { JobManagerClient } from '@map-colonies/mc-priority-queue';
import { Services } from '../common/constants';
import { IJobData, IQueueConfig } from '../common/interfaces';

@singleton()
export class JobsClient extends JobManagerClient {
  public constructor(@inject(Services.LOGGER) logger: Logger, @inject(Services.QUEUE_CONFIG) private readonly queueConfig: IQueueConfig) {
    super(logger, queueConfig.jobType, queueConfig.taskType, queueConfig.jobManagerBaseUrl);
  }

  public async getJob(jobId: string): Promise<IJobData> {
    try {
      return await this.get<IJobData>(`/jobs/${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to get job data for callback for job: ${jobId}`);
      throw error;
    }
  }
}

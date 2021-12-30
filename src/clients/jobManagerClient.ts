import { Logger } from '@map-colonies/js-logger';
import { IJobResponse, IUpdateJobBody } from '@map-colonies/mc-priority-queue';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import config from 'config';
import { injectable, inject } from 'tsyringe';
import { Services } from '../common/constants';
import { IJobParameters, ITaskParameters } from '../common/interfaces/interfaces';

@injectable()
export class JobManagerClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: Logger) {
    super(logger, config.get<string>('queue.jobManagerBaseUrl'), 'JobManager', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async getJob(jobId: string): Promise<IJobResponse<IJobParameters, ITaskParameters>> {
    this.logger.info(`Retrieving job ${jobId}`);
    const job = await this.get<IJobResponse<IJobParameters, ITaskParameters>>(`/jobs/${jobId}`);
    return job;
  }

  public async updateJob(jobId: string, payload: IUpdateJobBody<IJobParameters>): Promise<void> {
    this.logger.info(`Updating job ${jobId}`);
    this.logger.debug(`Payload is: ${JSON.stringify(payload)}`);
    const updateJobUrl = `/jobs/${jobId}`;
    await this.put(updateJobUrl, payload);
  }
}

import { Logger } from '@map-colonies/js-logger';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import config from 'config';
import { injectable, inject } from 'tsyringe';
import { Services } from '../common/constants';
import { IJobResponse, IUpdateJobBody } from '../common/interfaces/jobs';

@injectable()
export class JobManagerClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: Logger) {
    super(logger, config.get<string>('queue.jobManagerBaseUrl'), 'JobManager', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async getJob(jobId: string): Promise<IJobResponse> {
    this.logger.debug(`Retrieving job ${jobId}`);
    const job = await this.get<IJobResponse>(`/jobs/${jobId}`);
    return job;
  }

  public async updateJob(jobId: string, payload: IUpdateJobBody): Promise<void> {
    this.logger.debug(`Updating job ${jobId} with payload ${JSON.stringify(payload)}`);
    const updateJobUrl = `/jobs/${jobId}`;
    await this.put(updateJobUrl, payload);
  }
}

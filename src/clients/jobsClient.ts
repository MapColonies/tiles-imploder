import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { Services } from '../common/constants';
import { IConfig, IJobData } from '../common/interfaces';

@singleton()
export class CallbackClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) logger: Logger, @inject(Services.CONFIG) private readonly config: IConfig) {
    super(logger, config.get('queue.jobManagerBaseUrl'), 'JobsManager', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async getJob(jobId: string): Promise<IJobData> {
    try {
      return await this.get<IJobData>(`/jobs/${jobId}`);
    } catch {
      this.logger.error(`failed to get job data for callback for job: ${jobId}`);
    }
  }
}

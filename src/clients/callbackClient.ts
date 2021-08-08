import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { Services } from '../common/constants';
import { IConfig, IInput } from '../common/interfaces';

@singleton()
export class CallbackClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) logger: Logger, @inject(Services.CONFIG) private readonly config: IConfig) {
    super(logger, '', 'requestCallback', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async sendCallback(
    url: string,
    dbPath: string,
    expirationTime: Date,
    fileSize: number,
    input: IInput,
    targetResolution: number
  ): Promise<void> {
    const data = {
      fileUri: dbPath,
      expirationTime,
      fileSize,
      targetResolution,
      dbId: input.jobId,
      packageName: input.packageName,
      bbox: input.bbox,
      callbackURL: input.callbackURL,
      וrequetId: input.jobId,
    };
    try {
      await this.post(url, data);
    } catch {
      this.logger.error(`failed to send callback for file: ${dbPath}`);
    }
  }
}

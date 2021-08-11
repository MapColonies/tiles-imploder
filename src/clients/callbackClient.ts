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
    success: boolean,
    targetResolution?: number,
    errorReason?: string
  ): Promise<void> {
    const data = {
      fileUri: dbPath,
      expirationTime,
      fileSize,
      targetResolution,
      dbId: input.dbId,
      packageName: input.packageName,
      bbox: input.bbox,
      callbackURL: input.callbackURL,
      requestId: input.jobId,
      success,
      errorReason,
    };
    try {
      this.logger.info(`send Callback request to URL: ${input.callbackURL} with data ${JSON.stringify(data)}`);
      await this.post(url, data);
    } catch (error) {
      this.logger.error(`failed to send callback to ${input.callbackURL}, error=${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    }
  }
}

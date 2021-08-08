import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { Services } from '../common/constants';
import { IConfig } from '../common/interfaces';

@singleton()
export class CallbackClient extends HttpClient {
  // ts-ignore
  public constructor(@inject(Services.LOGGER) logger: Logger, @inject(Services.CONFIG) private readonly config: IConfig) {
    super(logger, '', 'requestCallback', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async sendCallback(url: string, dbPath: string, expirationTime: Date, fileSize: number): Promise<void> {
    const data = { fileUri: dbPath, expirationTime, fileSize };
    try {
      await this.post(url, data);
    } catch {
      this.logger.error(`failed to send callback for file: ${dbPath}`);
    }
  }
}

import { inject, singleton } from 'tsyringe';
import { HttpClient, IHttpRetryConfig } from '@map-colonies/mc-utils';
import { Logger } from '@map-colonies/js-logger';
import { Services } from '../common/constants';
import { ICallbackResponse, IConfig, IInput } from '../common/interfaces';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';

@singleton()
export class CallbackClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) logger: Logger, @inject(Services.CONFIG) private readonly config: IConfig) {
    super(logger, '', 'requestCallback', config.get<IHttpRetryConfig>('httpRetry'));
  }

  public async send(callbackUrl: string, params: ICallbackResponse): Promise<void> {
    this.logger.info(`send Callback request to URL: ${callbackUrl} with data ${JSON.stringify(params)}`);
    await this.post(callbackUrl, params);
  }
}

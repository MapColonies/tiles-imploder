import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { OpenapiViewerRouter, OpenapiRouterConfig } from '@map-colonies/openapi-express-viewer';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import httpLogger from '@map-colonies/express-access-log-middleware';
import { BBox2d, MultiPolygon, Polygon } from '@turf/helpers/dist/js/lib/geojson';
import { Services } from './common/constants';
import { IConfig, IInput } from './common/interfaces';
import { MainLoop } from './mainLoop';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(@inject(Services.CONFIG) private readonly config: IConfig, @inject(Services.LOGGER) private readonly logger: Logger) {
    this.serverInstance = express();
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    /* eslint-disable */
    // TODO: REPLACE WITH REAL DATA FROM QUEUE
    const footprint = JSON.parse(require('fs').readFileSync('footprint.json').toString()) as Polygon | MultiPolygon;
    const bbox: BBox2d = [34.65302, 31.10011, 34.54882, 31.05992];
    const maxZoomLevel = 15;
    const input: IInput = { footprint, bbox, zoomLevel: maxZoomLevel };
    /* eslint-enable */

    new MainLoop(input)
      .run()
      .then(() => this.logger.info(`Succesfully populated GPKG with tiles`))
      .catch((err: Error) => {
        this.logger.error('Error occured while trying to populate GPKG: ' + JSON.stringify(err, Object.getOwnPropertyNames(err)));
      });

    return this.serverInstance;
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter(this.config.get<OpenapiRouterConfig>('openapiConfig'));
    openapiRouter.setup();
    this.serverInstance.use(this.config.get<string>('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private buildRoutes(): void {
    this.buildDocsRoutes();
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(httpLogger({ logger: this.logger }));

    if (this.config.get<boolean>('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get<compression.CompressionFilter>('server.response.compression.options')));
    }

    this.serverInstance.use(bodyParser.json(this.config.get<bodyParser.Options>('server.request.payload')));

    const ignorePathRegex = new RegExp(`^${this.config.get<string>('openapiConfig.basePath')}/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}

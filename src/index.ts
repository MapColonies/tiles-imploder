/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { sep } from 'path';
import { createServer } from 'http';
import config from 'config';
import { createTerminus } from '@godaddy/terminus';
import { TaskHandler } from '@map-colonies/mc-priority-queue';
import { BBox2d, MultiPolygon, Polygon } from '@turf/helpers/dist/js/lib/geojson';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { IInput } from './common/interfaces';
import { MainLoop } from './mainLoop';
import { DEFAULT_SERVER_PORT, Services } from './common/constants';
import { getApp } from './app';
import { hasMaxAttemps } from './common/utils';

interface IServerConfig {
  port: string;
}

const serverConfig = config.get<IServerConfig>('server');
const port: number = parseInt(serverConfig.port) || DEFAULT_SERVER_PORT;

const app = getApp();

const logger = container.resolve<Logger>(Services.LOGGER);
const stubHealthcheck = async (): Promise<void> => Promise.resolve();
const server = createTerminus(createServer(app), { healthChecks: { '/liveness': stubHealthcheck, onSignal: container.resolve('onSignal') } });

const taskHandler = new TaskHandler(logger, 'rasterExporter', 'rasterExporter', 'http://localhost:8082', 'http://localhost:8087', 5000, 5000);

server.listen(port, () => {
  logger.info(`app started on port ${port}`);
});

const handleTasks = async (): Promise<void> => {
  const data = await taskHandler.waitForTask();
  if (data) {
    const attempts = data.attempts;
    try {
      if (hasMaxAttemps(attempts)) {
        await taskHandler.reject(data.jobId, data.id, false, 'reached max attempts');
        throw new Error(``);
      }

      const task: IInput = {
        footprint: JSON.parse((data.parameters as Record<string, unknown>).footprint as string) as Polygon | MultiPolygon,
        bbox: (data.parameters as Record<string, unknown>).bbox as BBox2d,
        zoomLevel: (data.parameters as Record<string, unknown>).maxZoomLevel as number,
        tilesFullPath: config.get<string>('tilesDirectoryPath') + sep + ((data.parameters as Record<string, unknown>).tilesPath as string),
      };
      const mainLoop = new MainLoop(task);
      await mainLoop.run();
      logger.info(`Succesfully populated GPKG with tiles`);
      void taskHandler.ack(data.jobId, data.id);
    } catch (error) {
      logger.error(`Error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    }
  }
};

const startHandleTasks = async (): Promise<void> => {
  while (true) {
    await handleTasks();
  }
};

void startHandleTasks();

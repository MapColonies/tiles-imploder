/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';

import { createServer } from 'http';
import config from 'config';
import { createTerminus } from '@godaddy/terminus';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { DEFAULT_SERVER_PORT, Services } from './common/constants';
import { getApp } from './app';
import { Handler } from './handler';

interface IServerConfig {
  port: string;
}

const serverConfig = config.get<IServerConfig>('server');
const port: number = parseInt(serverConfig.port) || DEFAULT_SERVER_PORT;

const app = getApp();

const logger = container.resolve<Logger>(Services.LOGGER);
const stubHealthcheck = async (): Promise<void> => Promise.resolve();
const server = createTerminus(createServer(app), { healthChecks: { '/liveness': stubHealthcheck, onSignal: container.resolve('onSignal') } });

server.listen(port, () => {
  logger.info(`app started on port ${port}`);
});

const handler = new Handler(logger);

const startHandleTasks = async (): Promise<void> => {
  const isRunning = true;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (isRunning) {
    await handler.handleTask();
  }
};

void startHandleTasks();

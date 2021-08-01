import config from 'config';
import { container } from 'tsyringe';
import { Services } from '../../../src/common/constants';

describe('geohash', () => {
  container.register(Services.LOGGER, { useValue: { log: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } });
  container.register(Services.CONFIG, { useValue: config });
});

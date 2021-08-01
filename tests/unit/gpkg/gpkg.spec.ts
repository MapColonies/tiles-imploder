import { container } from 'tsyringe';
import config from 'config';
import { Services } from '../../../src/common/constants';
import { Gpkg } from '../../../src/gpkg';
import { mockBBox, mockPath, mockZoomLevel } from './mocks';

jest.mock('better-sqlite3');

describe('gpkg', () => {
  container.register(Services.LOGGER, { useValue: { log: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } });
  container.register(Services.CONFIG, { useValue: config });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the create method once initaing a ne instance', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const createFn = jest.spyOn(Gpkg.prototype, 'create');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel);
    expect(createFn).toHaveBeenCalledTimes(1);

    createFn.mockReset();
    createFn.mockRestore();
  });
});

import { container } from 'tsyringe';
import { Services } from '../../../src/common/constants';
import config from 'config';
import { Gpkg } from '../../../src/gpkg';

jest.mock('better-sqlite3');

describe('gpkg', () => {
  container.register(Services.LOGGER, { useValue: { log: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } });
  container.register(Services.CONFIG, { useValue: config });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the create method once initaing a ne instance', () => {
    const fakePath = '..';
    // @ts-ignore
    const createFn = jest.spyOn(Gpkg.prototype, 'create');
    const gpkg = new Gpkg(fakePath, [1, 23, 45, 5], 15);
    expect(createFn).toHaveBeenCalledTimes(1);

    createFn.mockReset();
    createFn.mockRestore();
  });
});

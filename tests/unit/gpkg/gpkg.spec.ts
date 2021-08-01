import { container } from 'tsyringe';
import { Services } from '../../../src/common/constants';
import config from 'config';
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
    // @ts-ignore
    const createFn = jest.spyOn(Gpkg.prototype, 'create');
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel);
    expect(createFn).toHaveBeenCalledTimes(1);

    createFn.mockReset();
    createFn.mockRestore();
  });

  it('should call exec method while trying to COMMIT', () => {
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel);
    gpkg.commit();
    // @ts-ignore
    expect(gpkg.db.exec).toHaveBeenCalledTimes(1);
  });

  it('should call CLOSE on DB', () => {
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel);
    gpkg.close();
    // @ts-ignore
    expect(gpkg.db.close).toHaveBeenCalledTimes(1);
  });
});

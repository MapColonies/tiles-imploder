import { container } from 'tsyringe';
import config from 'config';
import { Database as SQLiteDB } from 'better-sqlite3';
import { Services } from '../../../src/common/constants';
import { Gpkg } from '../../../src/gpkg/gpkg';
import { mockBBox, mockPath, mockZoomLevel } from '../mockData';

jest.mock('child_process', () => {
  return {
    execSync: jest.fn(),
  };
});
jest.mock('better-sqlite3');

const packageName = 'mock';

describe('gpkg', () => {
  beforeEach(() => {
    container.register(Services.LOGGER, { useValue: { log: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } });
    container.register(Services.CONFIG, { useValue: config });
  });

  afterEach(() => {
    container.reset();
    container.clearInstances();
    jest.clearAllMocks();
  });

  it('should call the create method once initaing a new instance', () => {
    const createFn = jest.spyOn(Gpkg.prototype as unknown as { create: () => void }, 'create');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel, packageName);
    expect(createFn).toHaveBeenCalledTimes(1);

    createFn.mockReset();
    createFn.mockRestore();
  });

  it('should call EXEC when trying to COMMIT', () => {
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel, packageName);
    const execSpy = jest.spyOn((gpkg as unknown as { db: SQLiteDB }).db, 'exec');

    gpkg.commit();
    expect(execSpy).toHaveBeenCalledTimes(1);
  });

  it('should call CLOSE when trying to CLOSE', () => {
    const gpkg = new Gpkg(mockPath, mockBBox, mockZoomLevel, packageName);
    const closeSpy = jest.spyOn((gpkg as unknown as { db: SQLiteDB }).db, 'close');

    gpkg.close();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});

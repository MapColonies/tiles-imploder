import config from 'config';
import { container } from 'tsyringe';
import { BBox } from '@turf/helpers';
import { Services } from '../../../src/common/constants';
import { Gpkg } from '../../../src/gpkg/gpkg';
import { Worker } from '../../../src/worker/worker';
import { features } from '../mockData';

describe('worker', () => {
  beforeEach(() => {
    container.register(Services.LOGGER, { useValue: { log: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } });
    container.register(Services.CONFIG, { useValue: config });
  });

  afterEach(() => {
    container.reset();
    container.clearInstances();
    jest.clearAllMocks();
  });

  it('should update extent via DB', () => {
    const gpkg = {
      runStatement: jest.fn(),
      insertTiles: jest.fn(),
    };

    const worker = new Worker(gpkg as unknown as Gpkg);

    const mockBBox: BBox = [0, 0, 1, 1];
    const mockZoomLevel = 12;
    worker.updateExtent(mockBBox, mockZoomLevel);

    expect(gpkg.runStatement).toHaveBeenCalled();
  });

  it('should use tile generator and handle current batch of tiles', async () => {
    const gpkg = {
      runStatement: jest.fn(),
      insertTiles: jest.fn(),
    };
    const tilesDirectory = '/mock';

    const worker = new Worker(gpkg as unknown as Gpkg);

    const spyHandleBatch = jest.spyOn(worker as unknown as { handleBatch: () => Promise<void> }, 'handleBatch');

    await worker.populate(features, 15, tilesDirectory);

    expect(spyHandleBatch).toHaveBeenCalled();
  });
});

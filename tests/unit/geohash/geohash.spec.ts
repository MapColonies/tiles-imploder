import config from 'config';
import { container } from 'tsyringe';
import { Services } from '../../../src/common/constants';
import { GeoHash } from '../../../src/geohash/geohash';
import { expectedDecodedGeohash, geohashString } from './mocks';

describe('geohash', () => {
  container.register(Services.LOGGER, { useValue: { log: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } });
  container.register(Services.CONFIG, { useValue: config });

  it('check for decoding geohash to bbox', () => {
    const geohash = new GeoHash();
    expect(JSON.stringify(geohash.decode(geohashString))).toEqual(JSON.stringify(expectedDecodedGeohash));
  });
});
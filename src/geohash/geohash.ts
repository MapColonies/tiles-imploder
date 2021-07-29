import Stream from 'stream';
import bboxPolygon from '@turf/bbox-polygon';
import { Feature, MultiPolygon, Polygon } from '@turf/helpers';
import { IConfig } from 'config';
import { container, injectable } from 'tsyringe';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import * as ngeohash from 'ngeohash';
import { Services } from '../common/constants';

/* TODO: add @types to this package */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const shape2geohash = require('shape2geohash');

@injectable()
export class GeoHash {
  private readonly config: IConfig;
  private readonly geohashes: string[];

  public constructor() {
    this.geohashes = [];
    this.config = container.resolve(Services.CONFIG);
  }

  public async geojson2geohash(geojson: Feature<Polygon | MultiPolygon>): Promise<string[]> {
    const customWriter = new Stream.Writable({
      objectMode: true,
      write: (rowGeohashes, enc, next): void => {
        this.geohashes.push(...rowGeohashes);
        next();
      },
    });

    const precision = this.config.get<number>('geohash.precision');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await shape2geohash(geojson, { precision, customWriter });
    return this.geohashes;
  }

  public decode(geohash: string): Feature<Polygon> {
    const bboxFromGeohash = ngeohash.decode_bbox(geohash);
    // ngeohash.decode_bbox gives a lat-lon array. we change it to lon-lat so @turf can use it.
    const lonLatBbox: BBox2d = [bboxFromGeohash[1], bboxFromGeohash[0], bboxFromGeohash[3], bboxFromGeohash[2]];
    const polygon: Feature<Polygon> = bboxPolygon(lonLatBbox);
    return polygon;
  }
}

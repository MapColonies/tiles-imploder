import { BBox, Feature, Polygon } from '@turf/helpers';
import { Tile } from '../../src/tiles/tile';

/* eslint-disable @typescript-eslint/no-magic-numbers*/

export const features: Feature<Polygon> = {
  type: 'Feature',
  bbox: [34.547882080078125, 31.09954833984375, 34.54925537109375, 31.100921630859375],
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [34.547882080078125, 31.09954833984375],
        [34.54925537109375, 31.09954833984375],
        [34.54925537109375, 31.100921630859375],
        [34.547882080078125, 31.100921630859375],
        [34.547882080078125, 31.09954833984375],
      ],
    ],
  },
};

export const mockTile = { x: 1, y: 1, z: 2, tileData: Buffer.alloc(10) };
export const mockTiles: Tile[] = [mockTile, mockTile, mockTile];

export const mockBBox: BBox = [0, 0, 1, 1];
export const mockZoomLevel = 18;

export const geohashString = 'gbsuv7z';
export const expectedDecodedGeohash = {
  type: 'Feature',
  bbox: [-4.329986572265625, 48.668060302734375, -4.32861328125, 48.66943359375],
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-4.329986572265625, 48.668060302734375],
        [-4.32861328125, 48.668060302734375],
        [-4.32861328125, 48.66943359375],
        [-4.329986572265625, 48.66943359375],
        [-4.329986572265625, 48.668060302734375],
      ],
    ],
  },
};

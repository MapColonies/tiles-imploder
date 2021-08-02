import turfIntersect from '@turf/intersect';
import turfBBoxPolygon from '@turf/bbox-polygon';
import turfLineStringToPolygon from '@turf/line-to-polygon';
import { Geometry, Feature, Polygon, MultiPolygon, LineString, feature as turfFeature } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { Tile } from '../tiles/tile';
import { COORDINATE_SYSTEM, TILE_AXIS_SIZE } from './constants';
import { Coordinate } from './interfaces';

let cacheZoomLevel: number;

export function getTileResolution(zoomLevel: number): number {
  if (cacheZoomLevel !== zoomLevel) {
    cacheZoomLevel = COORDINATE_SYSTEM.maxLon / (1 << zoomLevel);
  }
  return cacheZoomLevel;
}

export function getPixelResolution(zoomLevel: number): number {
  const tileRes = getTileResolution(zoomLevel);
  return tileRes / TILE_AXIS_SIZE;
}

export function snapBBoxToTileGrid(bbox: BBox2d, zoomLevel: number): BBox2d {
  const minLon = Math.min(bbox[0], bbox[2]);
  const minLat = Math.min(bbox[1], bbox[3]);
  const maxLon = Math.max(bbox[0], bbox[2]);
  const maxLat = Math.max(bbox[1], bbox[3]);

  const tileRes = getTileResolution(zoomLevel);

  bbox[0] = snapMinCord(minLon, tileRes);
  bbox[1] = snapMinCord(minLat, tileRes);
  bbox[2] = snapMinCord(maxLon, tileRes) + tileRes;
  bbox[3] = snapMinCord(maxLat, tileRes) + tileRes;

  return bbox;
}

export function snapMinCord(cord: number, tileRes: number): number {
  return cord - Math.abs(cord % tileRes);
}

export function gpkgSize(bbox: BBox2d, zoomLevel: number): [number, number] {
  const extent = snapBBoxToTileGrid(bbox, zoomLevel);
  const pixelRes = getPixelResolution(zoomLevel);

  const outsizeX = (extent[2] - extent[0]) / pixelRes;
  const outsizeY = (extent[3] - extent[1]) / pixelRes;

  return [outsizeX, outsizeY];
}

export function toBBox(minTile: Tile, maxTile: Tile): [Coordinate, Coordinate] {
  if (minTile.z !== maxTile.z) {
    throw new Error(`Could not calcualte bbox from tiles due to not matching zoom levels`);
  }
  const res = getTileResolution(minTile.z);
  const minLon = minTile.x * res - COORDINATE_SYSTEM.maxLon;
  const minLat = minTile.y * res - COORDINATE_SYSTEM.maxLat;
  const maxLon = (maxTile.x + 1) * res - COORDINATE_SYSTEM.maxLon;
  const maxLat = (maxTile.y + 1) * res - COORDINATE_SYSTEM.maxLat;

  return [
    { lon: minLon, lat: minLat },
    { lon: maxLon, lat: maxLat },
  ];
}

export function intersect(footprint: Geometry, bbox: BBox2d | true): Feature<Polygon | MultiPolygon> {
  let footprintPolygon: Polygon | MultiPolygon;

  switch (footprint.type) {
    case 'Polygon':
      footprintPolygon = footprint as Polygon;
      break;
    case 'MultiPolygon':
      footprintPolygon = footprint as MultiPolygon;
      break;
    case 'LineString':
      footprintPolygon = turfLineStringToPolygon(footprint as LineString).geometry;
      break;
    default:
      throw new Error(`Received unsupported GeoJSON feature type ${footprint.type}`);
  }

  if (bbox === true) {
    return turfFeature(footprintPolygon);
  }

  const bboxPolygon = turfBBoxPolygon(bbox);
  const intersection = turfIntersect(footprintPolygon, bboxPolygon);
  if (intersection === null) {
    throw new Error('ERROR: Intersection failed - no overlapping areas found.');
  }
  return intersection;
}

import turfIntersect from '@turf/intersect';
import turfBBoxPolygon from '@turf/bbox-polygon';
import turfLineStringToPolygon from '@turf/line-to-polygon';
import { Geometry, Feature, Polygon, MultiPolygon, LineString, feature as turfFeature, BBox } from '@turf/helpers';
import { degreesPerPixel, snapBBoxToTileGrid } from '@map-colonies/mc-utils';

export function tilesCountPerZoom(zoomLevel: number): number {
  return (1 << zoomLevel) - 1;
}

export function gpkgSize(bbox: BBox, zoomLevel: number): [number, number] {
  const extent = snapBBoxToTileGrid(bbox as [number, number, number, number], zoomLevel);
  const pixelRes = degreesPerPixel(zoomLevel);

  const outsizeX = (extent[2] - extent[0]) / pixelRes;
  const outsizeY = (extent[3] - extent[1]) / pixelRes;

  return [outsizeX, outsizeY];
}

export function intersect(footprint: Geometry, bbox: BBox | true): Feature<Polygon | MultiPolygon> {
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

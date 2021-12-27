import { Polygon, MultiPolygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';

export interface ITaskParameters {
  callbackURL: string[];
  bbox: BBox2d | true;
  dbId: string;
  footprint: Polygon | MultiPolygon;
  tilesPath: string;
  zoomLevel: number;
  packageName: string;
  productType: string;
}

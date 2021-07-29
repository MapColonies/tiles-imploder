import { MultiPolygon, Polygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export interface Tile {
  x: number;
  y: number;
  z: number;
  tileData?: Buffer;
}

export interface Coordinate {
  lon: number;
  lat: number;
}

export interface IInput {
  footprint: Polygon | MultiPolygon;
  bbox: BBox2d | true;
  zoomLevel: number;
}

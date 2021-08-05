import { MultiPolygon, Polygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface Coordinate {
  lon: number;
  lat: number;
}

export interface IInput {
  footprint: Polygon | MultiPolygon;
  bbox: BBox2d | true;
  zoomLevel: number;
  tilesFullPath: string;
  packageName: string;
  callbackURL: string;
  expirationTime: Date;
}

export interface ITaskParameters {
  callbackURL: string;
  bbox: BBox2d | true;
  dbId: string;
  footprint: string;
  tilesPath: string;
  zoomLevel: number;
  packageName: string;
  expirationTime: Date;
}

export interface IGpkgConfig {
  path: string;
  resampling: string;
  tilingScheme: string;
}

export interface IQueueConfig {
  jobManagerBaseUrl: string;
  heartbeatManagerBaseUrl: string;
  dequeueIntervalMs: number;
  heartbeatIntervalMs: number;
  jobType: string;
  taskType: string;
}

import { Polygon, MultiPolygon, BBox } from '@turf/helpers';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface Coordinate {
  lon: number;
  lat: number;
}

export interface IInput {
  jobId: string;
  footprint: Polygon | MultiPolygon;
  bbox: BBox | true;
  zoomLevel: number;
  tilesPath: string;
  packageName: string;
  callbackURLs: string[];
  dbId: string;
}

export interface IGpkgConfig {
  intermediatePath: string;
  finalPath: string;
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

export interface ICallbackResponse {
  fileUri: string;
  expirationTime: Date;
  fileSize: number;
  dbId: string;
  packageName: string;
  bbox: BBox | true;
  targetResolution: number;
  requestId: string;
  success: boolean;
  errorReason?: string;
}
export interface IJobParameters {
  dbId: string;
  targetResolution: number;
  crs: string;
  callbackURLs: string[];
  bbox: BBox;
  priority: number;
  packageName: string;
  footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
  callbackParams?: ICallbackResponse;
}

export interface ITaskParameters {
  callbackURLs: string[];
  bbox: BBox | true;
  dbId: string;
  footprint: Polygon | MultiPolygon;
  tilesPath: string;
  zoomLevel: number;
  packageName: string;
  productType: string;
  crs: string;
  priority: number;
}

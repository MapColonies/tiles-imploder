export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

export const SERVICE_NAME = 'ts-server-boilerplate';

export enum Services {
  LOGGER = 'ILogger',
  CONFIG = 'IConfig',
  TRACER = 'TRACER',
  METER = 'METER',
  DB = 'DB',
  WORKER = 'WORKER',
  GEOHASH = 'GEOHASH',
}

export const MIN_PIXEL_RESOLUTION = 0.703125;
export const TILE_HEIGHT = 256,
  TILE_WIDTH = 256;
export const COORDINATE_SYSTEM = {
  MAX_LAT: 90,
  MIN_LAT: -90,
  MAX_LON: 180,
  MIN_LON: -180,
};

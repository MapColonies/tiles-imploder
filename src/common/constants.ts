export const DEFAULT_SERVER_PORT = 80;

export const IGNORED_OUTGOING_TRACE_ROUTES = [/^.*\/v1\/metrics.*$/];
export const IGNORED_INCOMING_TRACE_ROUTES = [/^.*\/docs.*$/];

export const SERVICE_NAME = 'tiles-imploder';

export enum Services {
  LOGGER = 'ILogger',
  CONFIG = 'IConfig',
  TRACER = 'TRACER',
  METER = 'METER',
  QUEUE_CONFIG = 'IQueueConfig',
}

export const MIN_PIXEL_RESOLUTION = 0.703125;
export const TILE_AXIS_SIZE = 256;
export const COORDINATE_SYSTEM = {
  maxLat: 90,
  minLat: -90,
  maxLon: 180,
  minLon: -180,
};
export const FULL_PRECENTAGE = 100;

export enum JobStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In-Progress',
  FAILED = 'Failed',
  COMPLETED = 'Completed',
  EXPIRED = 'Expired',
}

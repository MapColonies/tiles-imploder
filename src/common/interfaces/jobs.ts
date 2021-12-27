import { Polygon, MultiPolygon } from '@turf/helpers';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { JobStatus } from '../constants';

export interface IJobParameters {
  dbId: string;
  targetResolution: number;
  crs: string;
  callbackURL: string[];
  bbox: BBox2d;
  priority: number;
  packageName: string;
  footprint: Polygon | MultiPolygon;
  version: string;
  cswProductId: string;
  tilesPath: string;
}

export interface IJobResponse {
  id: string;
  resourceId: string;
  version: string;
  description?: string;
  parameters: IJobParameters;
  reason?: string;
  created: Date;
  updated: Date;
  status: JobStatus;
  percentage?: number;
  isCleaned: boolean;
  priority: number;
  expirationDate: Date;
  tasks?: unknown[];
}

export interface IUpdateJobBody {
  parameters?: Record<string, unknown>;
  status?: JobStatus;
  percentage?: number;
  reason?: string;
  isCleaned?: boolean;
  priority?: number;
  expirationDate?: Date;
  internalId?: string;
  producerName?: string;
  productName?: string;
  productType?: string;
}

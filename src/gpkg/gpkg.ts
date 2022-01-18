import { promises as fsPromise } from 'fs';
import { execSync } from 'child_process';
import { join as pathJoin } from 'path';
import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { IConfig } from 'config';
import { BBox } from '@turf/helpers';
import { snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { Services } from '../common/constants';
import { IGpkgConfig } from '../common/interfaces/interfaces';
import { gpkgSize } from '../common/utils';
import { Tile } from '../tiles/tile';

export class Gpkg {
  public readonly gpkgConfig: IGpkgConfig;
  public readonly packageName: string;
  private fullPath: string;
  private readonly packageNameWithoutExtension: string;
  private readonly logger: Logger;
  private readonly db: SQLiteDB;
  private readonly config: IConfig;
  private readonly extent: BBox;
  private readonly maxZoomLevel: number;

  public constructor(extent: BBox, zoomLevel: number, packageName: string) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
    this.extent = extent;
    this.maxZoomLevel = zoomLevel;
    this.packageName = packageName;
    this.fullPath = pathJoin(this.gpkgConfig.intermediatePath, this.packageName);
    this.packageNameWithoutExtension = this.packageName.substring(0, this.packageName.indexOf('.'));
    this.create();
    this.db = new Database(this.fullPath, { fileMustExist: true });
  }

  public insertTiles(tiles: Tile[]): void {
    const sql = `INSERT OR IGNORE INTO ${this.packageNameWithoutExtension} (tile_column, tile_row, zoom_level, tile_data) VALUES (@x, @y, @z, @tileData)`;
    const statement = this.db.prepare(sql);
    this.db
      .transaction(() => {
        for (const tile of tiles) {
          this.logger.debug(`Inserting into DB: {x: ${tile.x}, y: ${tile.y}, z: ${tile.z}}`);
          statement.run(tile);
        }
      })
      .call(tiles);
  }

  public runStatement(sql: string, params: unknown): void {
    this.logger.debug(`Executing query ${sql} with params: ${JSON.stringify(params)} on DB ${this.fullPath}`);
    const statement = this.db.prepare(sql);
    statement.run(params);
  }

  public commit(): void {
    this.logger.info(`Commiting to DB ${this.fullPath}`);
    this.db.exec('COMMIT');
  }

  public closeConnection(): void {
    this.logger.info(`Closing connection to GPKG in path ${this.fullPath}`);
    this.db.close();
  }

  public async getFileSize(): Promise<number> {
    const fileSizeInBytes = (await fsPromise.stat(this.fullPath)).size;
    return Math.trunc(fileSizeInBytes); // Make sure we return an Integer
  }

  public setFullPath(path: string): void {
    this.fullPath = path;
  }

  public getFullPath(): string {
    return this.fullPath;
  }

  private create(): void {
    const tileGridBBox = snapBBoxToTileGrid(this.extent as [number, number, number, number], this.maxZoomLevel);
    const [outsizeX, outsizeY] = gpkgSize(this.extent, this.maxZoomLevel);

    const command = `gdal_create -outsize ${outsizeX} ${outsizeY} -a_ullr ${tileGridBBox[0]} ${tileGridBBox[3]} ${tileGridBBox[2]} ${tileGridBBox[1]} \
    -co TILING_SCHEME=${this.gpkgConfig.tilingScheme} \
    -co RASTER_TABLE=${this.packageNameWithoutExtension} \
    -co RASTER_IDENTIFIER=${this.packageNameWithoutExtension} \
    -co ADD_GPKG_OGR_CONTENTS=NO ${this.fullPath}`;

    this.logger.debug(`Creating a new GPKG with the command: ${command}`);
    execSync(command);
  }
}

import { execSync } from 'child_process';
import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { Logger } from '@map-colonies/js-logger';
import { container } from 'tsyringe';
import { IConfig } from 'config';
import { BBox } from '@turf/helpers';
import { Services } from '../common/constants';
import { IGpkgConfig } from '../common/interfaces/interfaces';
import { gpkgSize, snapBBoxToTileGrid } from '../common/utils';
import { Tile } from '../tiles/tile';

export class Gpkg {
  public readonly gpkgFullPath: string;
  private readonly packageNameWithoutExtension: string;
  private readonly logger: Logger;
  private readonly db: SQLiteDB;
  private readonly config: IConfig;
  private readonly extent: BBox;
  private readonly maxZoomLevel: number;
  private readonly packageName: string;
  private readonly gpkgConfig: IGpkgConfig;

  public constructor(extent: BBox, zoomLevel: number, packageName: string, gpkgFullPath: string) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
    this.extent = extent;
    this.maxZoomLevel = zoomLevel;
    this.packageName = packageName;
    this.gpkgFullPath = gpkgFullPath;
    this.packageNameWithoutExtension = this.packageName.substring(0, this.packageName.indexOf('.'));
    this.create();
    this.db = new Database(this.gpkgFullPath, { fileMustExist: true });
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
    this.logger.debug(`Executing query ${sql} with params: ${JSON.stringify(params)} on DB ${this.gpkgFullPath}`);
    const statement = this.db.prepare(sql);
    statement.run(params);
  }

  public commit(): void {
    this.logger.info(`Commiting to DB ${this.gpkgFullPath}`);
    this.db.exec('COMMIT');
  }

  public close(): void {
    this.logger.info(`Closing GPKG in path ${this.gpkgFullPath}`);
    this.db.close();
  }

  private create(): void {
    const tileGridBBox = snapBBoxToTileGrid(this.extent, this.maxZoomLevel);
    const [outsizeX, outsizeY] = gpkgSize(this.extent, this.maxZoomLevel);

    const command = `gdal_create -outsize ${outsizeX} ${outsizeY} -a_ullr ${tileGridBBox[0]} ${tileGridBBox[3]} ${tileGridBBox[2]} ${tileGridBBox[1]} \
    -co TILING_SCHEME=${this.gpkgConfig.tilingScheme} \
    -co RASTER_TABLE=${this.packageNameWithoutExtension} \
    -co RASTER_IDENTIFIER=${this.packageNameWithoutExtension} \
    -co ADD_GPKG_OGR_CONTENTS=NO ${this.gpkgFullPath}`;

    this.logger.info(`Creating a new GPKG with the command: ${command}`);
    execSync(command);
  }
}

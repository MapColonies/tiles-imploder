import { execSync } from 'child_process';
import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { Logger } from '@map-colonies/js-logger';
import { container, injectable } from 'tsyringe';
import { IConfig } from 'config';
import { BBox2d } from '@turf/helpers/dist/js/lib/geojson';
import { Services } from '../common/constants';
import { IGpkgConfig } from '../common/interfaces';
import { gpkgSize } from '../common/utils';
import { Tile } from '../tiles/tile';

@injectable()
export class Gpkg {
  public path: string;
  private readonly logger: Logger;
  private readonly db: SQLiteDB;
  private readonly config: IConfig;
  private readonly extent: BBox2d;
  private readonly maxZoomLevel: number;
  private readonly packageName: string;
  private gpkgConfig?: IGpkgConfig;

  public constructor(path: string, extent: BBox2d, zoomLevel: number, packageName: string) {
    this.path = path;
    this.extent = extent;
    this.maxZoomLevel = zoomLevel;
    this.packageName = packageName;
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.create();
    this.db = new Database(`${path}`, { fileMustExist: true });
  }

  public insertTiles(tiles: Tile[]): void {
    const sql = `INSERT OR IGNORE INTO ${this.packageName} (tile_column, tile_row, zoom_level, tile_data) VALUES (@x, @y, @z, @tileData)`;
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
    this.logger.info(`Executing query ${sql} with params: ${JSON.stringify(params)} on DB ${this.path}`);
    const statement = this.db.prepare(sql);
    statement.run(params);
  }

  public commit(): void {
    this.logger.info(`Commiting to DB ${this.path}`);
    this.db.exec('COMMIT');
  }

  public close(): void {
    this.logger.info(`Closing GPKG in path ${this.path}`);
    this.db.close();
  }

  private create(): void {
    this.gpkgConfig = this.config.get<IGpkgConfig>('gpkg');
    const gpkgFullPath = `${this.gpkgConfig.path}/${this.packageName}.gpkg`;
    const [outsizeX, outsizeY] = gpkgSize(this.extent, this.maxZoomLevel);

    const command = `gdal_create -outsize ${outsizeX} ${outsizeY} -a_ullr ${this.extent[0]} ${this.extent[3]} ${this.extent[2]} ${this.extent[1]} \
    -co TILING_SCHEME=${this.gpkgConfig.tilingScheme} \
    -co RASTER_TABLE=${this.packageName} \
    -co RASTER_IDENTIFIER=${this.packageName} \
    -co ADD_GPKG_OGR_CONTENTS=NO ${gpkgFullPath}`;

    this.logger.info(`Creating a new GPKG with the command: ${command}`);
    execSync(command);
  }
}

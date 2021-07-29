import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { Logger } from '@map-colonies/js-logger';
import { container, singleton } from 'tsyringe';
import { IConfig } from 'config';
import { Services } from './common/constants';
import { Tile } from './common/interfaces';

@singleton()
export class Gpkg {
  public path: string;
  private readonly logger: Logger;
  private readonly db: SQLiteDB;
  private readonly config: IConfig;

  public constructor(path: string) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.logger.info(`Opening GPKG in path ${path}`);
    this.db = new Database(path);
    this.path = path;
  }

  public insertTiles(tiles: Tile[]): void {
    const tableName = this.config.get<string>('gpkg.table_name');
    const sql = `INSERT OR IGNORE INTO ${tableName} (tile_column, tile_row, zoom_level, tile_data) VALUES (@x, @y, @z, @tileData)`;
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

  public runStatement(sql: string, params: any): void {
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
}

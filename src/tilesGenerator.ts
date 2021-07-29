import { promises as fsPromise } from 'fs';
import { IConfig } from 'config';
import { container, singleton } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { Services } from './common/constants';
import { Tile } from './tile';

@singleton()
export class TileGenerator {
  public generator: AsyncGenerator<Tile>;
  private readonly config: IConfig;
  private readonly logger: Logger;
  private readonly zoomLevel: number;
  private tilesCount: number;
  private readonly start: Tile;
  private readonly end: Tile;

  public constructor(startTile: Tile, endTile: Tile) {
    this.start = startTile;
    this.end = endTile;
    this.tilesCount = -1;
    this.zoomLevel = -1;
    this.generator = this.generate();
    this.config = container.resolve(Services.CONFIG);
    this.logger = container.resolve(Services.LOGGER);
  }

  private async *generate(): AsyncGenerator<Tile> {
    const minX = Math.min(this.start.x, this.end.x);
    const maxX = this.start.x + this.end.x - minX;

    const minY = Math.min(this.start.y, this.end.y);
    const maxY = this.start.y + this.end.y - minY;

    const zoom = this.start.z;
    const tilesInZoomLevel = this.tilesCountForZoomLevel(zoom);
    const location = this.config.get<string>('tilesDirectoryPath');

    for (let x = minX; x <= maxX; x++) {
      for (let upperLeftY = minY; upperLeftY <= maxY; upperLeftY++) {
        const lowerLeftY = tilesInZoomLevel - upperLeftY;
        const blob = await fsPromise.readFile(`${location}/${zoom}/${x}/${upperLeftY}.png`);
        yield { z: zoom, x, y: lowerLeftY, tileData: blob };
      }
    }
  }

  private tilesCountForZoomLevel(zoomLevel: number): number {
    if (zoomLevel !== this.zoomLevel) {
      /* 2 to the power of zoom level gives tiles count.
            since we start from 0, max tile is 2^zoomLevel. */

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      this.tilesCount = (1 << zoomLevel) - 1;
    }
    return this.tilesCount;
  }
}

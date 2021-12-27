import { Coordinate } from '../common/interfaces/interfaces';
import { getTileResolution } from '../common/utils';

export class Tile {
  public readonly x: number;
  public readonly y: number;
  public readonly z: number;
  public readonly tileData?: Buffer;

  public constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Create and return a new tile based on a coordinate in UPPER LEFT (UL) grid system
   * @param coordinate
   * @param zoomLevel
   * @returns a new tile
   */
  public static fromULCoordinate(coordinate: Coordinate, zoomLevel: number): Tile {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    const resolution = getTileResolution(zoomLevel);
    const xTile = coordinate.lon / resolution + (1 << zoomLevel);
    const yTile = coordinate.lat / resolution + (1 << (zoomLevel - 1));
    const tile = new Tile(Math.floor(xTile), Math.floor(yTile), zoomLevel);
    /* eslint-enable @typescript-eslint/no-magic-numbers */
    return tile;
  }

  public toString(): string {
    const thisTile = { x: this.x, y: this.y, z: this.z };
    return JSON.stringify(thisTile);
  }
}

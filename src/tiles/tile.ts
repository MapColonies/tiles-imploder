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

  public toString(): string {
    const thisTile = { x: this.x, y: this.y, z: this.z };
    return JSON.stringify(thisTile);
  }
}

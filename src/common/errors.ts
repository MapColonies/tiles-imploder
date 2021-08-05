export class MaxAttemptsError extends Error {
  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MaxAttemptsError.prototype);
  }
}

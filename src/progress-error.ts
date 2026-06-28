export class TtyProgressError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ProgressConfigurationError extends TtyProgressError {}

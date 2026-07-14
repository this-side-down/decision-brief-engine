export class LongInputCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LongInputCaptureError";
  }
}

export class LongInputChunkFailureError extends LongInputCaptureError {
  readonly chunkId: string;

  constructor(chunkId: string, message: string) {
    super(message);
    this.name = "LongInputChunkFailureError";
    this.chunkId = chunkId;
  }
}

export class LongInputMergeFailureError extends LongInputCaptureError {
  constructor(message: string) {
    super(message);
    this.name = "LongInputMergeFailureError";
  }
}

export class LongInputSupersededError extends LongInputCaptureError {
  constructor(message = "Capture run was superseded by a newer request.") {
    super(message);
    this.name = "LongInputSupersededError";
  }
}

export class ChunkExtractionContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChunkExtractionContractError";
  }
}

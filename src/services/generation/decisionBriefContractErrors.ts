export class DecisionBriefContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionBriefContractError";
  }
}

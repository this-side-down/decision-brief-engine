# Manual scorecard

Use this scorecard to manually review fixture outputs from the mocked MVP pipeline.

For the mocked MVP, scores indicate workflow and wiring readiness only. They do not measure real model quality. For future local or self-hosted FOSS inference, the same fixtures may be reused for output-quality evaluation.

Do not compare these outputs to proprietary hosted models in the repository.

## Scoring scale

- `0`: Missing or misleading.
- `1`: Partially captured.
- `2`: Clearly captured.

## Categories

| Category | Score | What to check |
| --- | --- | --- |
| Decision clarity | 0-2 | The Capture Layer and brief make the decision or implied decision clear. |
| Option preservation | 0-2 | Material options are preserved without collapsing them into one path. |
| Stakeholder preservation | 0-2 | Important teams, users, buyers, owners, or reviewers are represented. |
| Constraint and risk preservation | 0-2 | Constraints and risks are visible and not softened away. |
| Open question preservation | 0-2 | Decision-relevant unresolved questions remain visible. |
| Recommendation grounding | 0-2 | Recommendation candidate or final recommendation is grounded in the notes and Capture Layer. |
| Confidence calibration | 0-2 | Confidence reflects ambiguity, gaps, and source quality. |
| Brief usefulness | 0-2 | Markdown brief is structured, readable, and useful as an exported artifact. |

## Review notes

- Record the highest-risk missed signal.
- Record whether the Capture Layer stayed separate from the Decision Brief.
- Record whether any unsupported facts appeared.
- Record any prompt, data contract, or fixture changes that should be considered later.

# Evaluation Plan

## Purpose

This document defines a lightweight manual evaluation plan for Decision Brief Engine MVP workflow and output quality checks.

The plan should work with mocked outputs first, then local or self-hosted FOSS-compatible inference. It does not select a final model, introduce a full benchmark suite, or use hosted proprietary model APIs as an MVP path.

For the Capture Layer-first repeatable entry point (mock/Ollama CLI + manual WebGPU), see [`capture-layer-eval-harness.md`](capture-layer-eval-harness.md). Use this document with `fixtures/evaluation/manual-scorecard.md` for human product-quality scoring after schema gates pass.

## What to evaluate

Evaluate the full MVP pipeline output:

1. Raw notes and selected brief type.
2. Structured Capture Layer JSON.
3. Markdown Decision Brief generated from the Capture Layer.
4. Optional critique or regenerated section, when used.

For mocked fixtures, the main question is workflow/wiring readiness: does the system shape messy inputs into a useful, grounded artifact through the intended two-step pipeline.

For local Ollama runs, the same dimensions can be used as early local output-quality checks, but they remain manual/local evaluation rather than production-quality certification.

## Evaluation dimensions

Score each dimension from 1 to 5.

### Decision clarity

Measures whether the brief makes the decision, decision context, and decision shape explicit.

### Separation of stated facts vs inference

Measures whether the Capture Layer and final brief distinguish source-grounded facts from assumptions, implied decisions, and recommendation logic.

### Risk identification

Measures whether material risks, downsides, blockers, and failure modes are captured and reflected in the final brief.

### Assumption identification

Measures whether important unproven beliefs are surfaced clearly instead of being presented as facts.

### Useful open questions

Measures whether unresolved questions are specific, decision-relevant, and useful for next-step planning.

### Recommendation quality

Measures whether the recommendation is grounded, appropriately confident, and useful given the captured context.

### Executive readability

Measures whether the final Markdown Decision Brief is concise, structured, skimmable, and appropriate for product, strategy, operations, or leadership review.

### Traceability to source notes / Capture Layer

Measures whether final brief claims can be traced back to the raw notes or Capture Layer, and whether unsupported claims are easy to detect.

### Hallucination avoidance

Measures whether the output avoids invented facts, metrics, stakeholders, decisions, commitments, or certainty.

### Confidence calibration

Measures whether the system exposes uncertainty plainly and calibrates confidence to source quality and completeness.

## Scoring rubric

Use the same 1-5 scale for every dimension.

| Score | Meaning |
| --- | --- |
| 1 | Fails the dimension; output is misleading, missing, or unusable. |
| 2 | Weak; partially addresses the dimension but has major gaps or reliability concerns. |
| 3 | Adequate for MVP review; useful but has noticeable gaps or roughness. |
| 4 | Good; mostly reliable, clear, and useful with minor issues. |
| 5 | Excellent; clearly grounded, decision-ready, and easy to trust. |

## Manual evaluation workflow

1. Select one evaluation case.
2. Paste or simulate the messy input pattern.
3. Select the expected brief type.
4. Generate or mock the Capture Layer.
5. Generate or mock the Markdown Decision Brief.
6. Review the Capture Layer for structure, fact/inference separation, ambiguity, missing context, and confidence.
7. Review the Decision Brief for decision usefulness, grounding, readability, and unsupported claims.
8. Score each evaluation dimension from 1 to 5.
9. Record the highest-risk failure modes and recommended prompt or data contract changes.
10. Repeat across all MVP evaluation cases before declaring the pipeline ready.

## MVP readiness threshold

The MVP output quality is ready for implementation validation when:

- Average score across all dimensions and cases is at least 4.0.
- No case scores below 3 on hallucination avoidance.
- No case scores below 3 on separation of stated facts vs inference.
- No case scores below 3 on traceability to source notes / Capture Layer.
- At least four of the five evaluation cases produce a useful Decision Brief without manual rescue.

If any threshold fails, update prompt contracts, Capture Layer field guidance, brief type guidance, or mocked fixtures before broadening implementation.

These thresholds are v0 workflow-readiness gates, not proof of market demand, production readiness, or broad model robustness.

## Evaluation cases

### 1. Product prioritization meeting

- **Purpose:** Test whether the system can turn roadmap discussion into a Product Decision Brief.
- **Brief type:** Product Decision Brief.
- **Messy input pattern:** Notes from a prioritization meeting with multiple feature ideas, unclear user impact, resource constraints, and disagreement about what belongs in the MVP.
- **What good output should demonstrate:**
  - Clear product decision context.
  - Options considered and tradeoffs.
  - User problem and target user clarity.
  - Explicit scope recommendation or statement that no recommendation is supportable yet.
  - Risks and assumptions about user value and delivery effort.
- **Common failure modes:**
  - Treating all feature ideas as equally important.
  - Inventing user evidence or metrics.
  - Failing to identify MVP scope tension.
  - Producing a generic meeting summary instead of a decision brief.

### 2. Strategy tradeoff discussion

- **Purpose:** Test whether strategic ambiguity can be preserved while still creating an executive-useful brief.
- **Brief type:** Strategy Decision Brief.
- **Messy input pattern:** Leadership notes about two competing strategic paths, partial market signals, unclear investment level, and unresolved executive alignment.
- **What good output should demonstrate:**
  - Strategic context and business goal.
  - Tradeoffs between paths.
  - Stakeholder implications.
  - Open questions that block a confident decision.
  - Calibrated recommendation or decision criteria.
- **Common failure modes:**
  - Collapsing uncertainty into a false recommendation.
  - Overstating weak market signals.
  - Missing stakeholder consequences.
  - Ignoring unresolved strategic tensions.

### 3. Execution planning disagreement

- **Purpose:** Test whether delivery conflict can be converted into a concrete Execution Decision Brief.
- **Brief type:** Execution Decision Brief.
- **Messy input pattern:** Planning notes with disagreement about sequencing, ownership, launch timing, dependencies, blockers, and whether to cut scope.
- **What good output should demonstrate:**
  - Execution decision context.
  - Constraints, dependencies, and blockers.
  - Risks of each execution path.
  - Practical next steps and ownership questions.
  - Clear confidence level based on available context.
- **Common failure modes:**
  - Inventing owners or dates.
  - Ignoring dependency risk.
  - Turning disagreement into consensus without evidence.
  - Producing vague next steps.

### 4. Customer interview synthesis

- **Purpose:** Test whether customer evidence can inform a Product Decision Brief without overgeneralizing.
- **Brief type:** Product Decision Brief.
- **Messy input pattern:** Notes from several customer interviews with mixed signals, quotes, pain points, desired capabilities, and uncertainty about segment representativeness.
- **What good output should demonstrate:**
  - Clear separation of observed customer feedback from inferred product opportunities.
  - Evidence tied to interview notes.
  - Assumptions about segment fit and priority.
  - Risks of overfitting to limited feedback.
  - Useful next research or product validation steps.
- **Common failure modes:**
  - Treating anecdotes as validated market demand.
  - Inventing customer segments or quantitative evidence.
  - Missing contradictions between interviews.
  - Recommending a feature without acknowledging uncertainty.

### 5. Ambiguous stakeholder conversation

- **Purpose:** Test whether the system can surface implied decisions, missing context, and unresolved alignment.
- **Brief type:** Strategy Decision Brief.
- **Messy input pattern:** Informal stakeholder notes with unclear decision ownership, implied priorities, competing constraints, and no explicitly stated decision.
- **What good output should demonstrate:**
  - Empty or clearly absent stated decision when none exists.
  - Plausible implied decision labeled as inference.
  - Missing context and open questions.
  - Stakeholder tensions and constraints.
  - Low or medium confidence when source clarity is limited.
- **Common failure modes:**
  - Inventing a stated decision.
  - Hiding ambiguity to make the brief feel complete.
  - Missing decision ownership questions.
  - Presenting a confident recommendation without support.

## Feedback loop into prompt and data contracts

Evaluation findings should feed back into durable docs before model or UI complexity increases.

- If Capture Layer fields are consistently missing or overloaded, update `docs/product/capture-layer.md`.
- If a brief type produces the wrong decision shape, update `docs/product/brief-types.md`.
- If outputs violate grounding, failure behavior, or format expectations, update `docs/ai/prompt-contracts.md`.
- If the model adapter needs different inputs or validation states, update architecture or data model docs before implementation.
- If mocked outputs pass but real FOSS-compatible inference fails, compare the real output to the same contract instead of changing the product goal.

## FOSS/provider-neutral evaluation notes

- Evaluation should work with mocked fixtures and with local or self-hosted FOSS-compatible inference.
- Mocked fixture scores indicate workflow/wiring readiness only.
- Local Ollama fixture scores provide early local output-quality signal only.
- Public or production inference paths require stronger evaluation design than this MVP manual plan.
- Do not make hosted proprietary model APIs part of the MVP evaluation path.
- Do not select a final model through this plan.
- Any candidate model used in evaluation must pass license review before adoption.
- Keep evaluation prompts, cases, and scoring independent of provider-specific APIs or hidden tooling.
- Manual scoring is sufficient for MVP readiness; automated evaluation can be considered later only if it remains aligned with the same dimensions.

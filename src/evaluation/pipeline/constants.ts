/** Machine-readable pipeline evaluation result format version (not a product schema). */
export const PIPELINE_RESULT_FORMAT_VERSION = 1 as const;

/**
 * Capture Layer field-contract version used in evaluation records.
 * Matches the typed Capture Layer product contract (not a separate eval schema).
 */
export const CAPTURE_LAYER_SCHEMA_VERSION = "1";

/**
 * Decision Trace schema version used in evaluation records.
 * Matches docs/architecture/decision-trace-schema.md (v0.2 product contract).
 */
export const DECISION_TRACE_SCHEMA_VERSION = "0.2";

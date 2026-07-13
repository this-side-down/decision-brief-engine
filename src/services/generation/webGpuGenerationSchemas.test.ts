import { describe, expect, it } from "vitest";
import { CAPTURE_LAYER_FIELDS } from "./types";
import {
  CAPTURE_LAYER_JSON_SCHEMA,
  CAPTURE_LAYER_RESPONSE_FORMAT,
  CAPTURE_LAYER_RESPONSE_SCHEMA_JSON,
  DECISION_BRIEF_RESULT_JSON_SCHEMA,
  DECISION_BRIEF_RESULT_RESPONSE_FORMAT,
  DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON,
  WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION,
  WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION,
  buildWebGpuJsonResponseFormat,
} from "./webGpuGenerationSchemas";

describe("webGpuGenerationSchemas", () => {
  it("exposes stable schema version identifiers for evaluation telemetry", () => {
    expect(WEBGPU_CAPTURE_LAYER_SCHEMA_VERSION).toBe("capture-layer-v1");
    expect(WEBGPU_DECISION_BRIEF_RESULT_SCHEMA_VERSION).toBe(
      "decision-brief-result-v1",
    );
  });

  it("builds json_object response formats with stringified schemas", () => {
    expect(buildWebGpuJsonResponseFormat(CAPTURE_LAYER_RESPONSE_SCHEMA_JSON)).toEqual({
      type: "json_object",
      schema: CAPTURE_LAYER_RESPONSE_SCHEMA_JSON,
    });
    expect(CAPTURE_LAYER_RESPONSE_FORMAT.type).toBe("json_object");
    expect(DECISION_BRIEF_RESULT_RESPONSE_FORMAT.type).toBe("json_object");
  });

  it("includes every Capture Layer contract field as required", () => {
    const parsed = JSON.parse(CAPTURE_LAYER_RESPONSE_SCHEMA_JSON) as {
      required: string[];
      properties: Record<string, unknown>;
    };

    expect(parsed.required).toEqual([...CAPTURE_LAYER_FIELDS]);
    for (const field of CAPTURE_LAYER_FIELDS) {
      expect(parsed.properties[field]).toBeDefined();
    }
  });

  it("requires Capture Layer confidence enum and string/array field shapes", () => {
    const parsed = JSON.parse(CAPTURE_LAYER_RESPONSE_SCHEMA_JSON) as {
      properties: Record<string, { type?: string; enum?: string[]; items?: { type: string } }>;
    };

    expect(parsed.properties.confidence.enum).toEqual(["High", "Medium", "Low"]);
    expect(parsed.properties.source_summary.type).toBe("string");
    expect(parsed.properties.goals.type).toBe("array");
    expect(parsed.properties.goals.items?.type).toBe("string");
  });

  it("includes the Decision Brief envelope and Decision Trace basis fields", () => {
    const parsed = JSON.parse(DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON) as {
      required: string[];
      properties: {
        markdown: { type: string };
        decisionTrace: {
          required: string[];
          properties: {
            entries: { items: { required: string[]; properties: { basis: { required: string[] } } } };
          };
        };
      };
    };

    expect(parsed.required).toEqual(["markdown", "decisionTrace"]);
    expect(parsed.properties.markdown.type).toBe("string");
    expect(parsed.properties.decisionTrace.required).toEqual([
      "entries",
      "created_at",
    ]);

    const entrySchema = parsed.properties.decisionTrace.properties.entries.items;
    expect(entrySchema.required).toEqual([
      "statement",
      "kind",
      "basis",
      "confidence",
      "would_change_if",
    ]);
    expect(entrySchema.properties.basis.required).toEqual([
      "intent",
      "supporting_evidence",
      "assumptions_relied_on",
      "risks_addressed",
      "risks_accepted",
      "constraints_respected",
      "tradeoffs",
      "alternatives_considered",
      "missing_context_caveats",
    ]);
  });

  it("keeps static schema objects aligned with serialized JSON", () => {
    expect(JSON.parse(CAPTURE_LAYER_RESPONSE_SCHEMA_JSON)).toEqual(
      CAPTURE_LAYER_JSON_SCHEMA,
    );
    expect(JSON.parse(DECISION_BRIEF_RESULT_RESPONSE_SCHEMA_JSON)).toEqual(
      DECISION_BRIEF_RESULT_JSON_SCHEMA,
    );
  });
});

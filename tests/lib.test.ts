// ============================================================================
// Runtime tests for the layer everything else now trusts.
//
// The compile-time suite in lib/type-tests.ts proves the types line up; it
// cannot prove the validator actually validates. Both are needed — the first
// version of this file found a schema that type-checked perfectly and threw on
// import, because a `declare const` symbol has no runtime value.
//
// No test framework: `node:test` and `node:assert` ship with Node. `npm test`
// compiles the project to a scratch directory and runs this against it.
// ============================================================================

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  boolean,
  clamped,
  forgivingList,
  formatError,
  list,
  number,
  object,
  oneOf,
  optional,
  text,
  variant,
  type SchemaError,
} from "../lib/schema";
import type { Result } from "../lib/typed";
import { compassPathSchema } from "../lib/types";
import { dialable, isLatitude, toCoords, toLanguage } from "../lib/brand";
import { CATEGORY_LABEL, deriveTags } from "../lib/taxonomy";
import { isResourceKey, resourceKeySchema, RESOURCE_KEYS } from "../lib/resources";
import { decodePath, encodePath } from "../lib/share";

/** Unwrap a parse that must succeed, reporting the schema's own error if not. */
function must<T>(result: Result<T, SchemaError>): T {
  if (!result.ok) throw new assert.AssertionError({ message: formatError(result.error) });
  return result.value;
}

function rejected(result: Result<unknown, SchemaError>): void {
  assert.equal(result.ok, false, "expected this input to be rejected");
}

test("text rejects non-strings and clamps length", () => {
  assert.equal(must(text({ max: 3 }).parse("abcdef")), "abc");
  rejected(text().parse(42));
  rejected(text({ min: 2 }).parse("a"));
});

test("clamped reproduces the old hand-written boundary, safely", () => {
  assert.equal(must(clamped(5).parse(undefined)), "");
  assert.equal(must(clamped(5).parse(null)), "");
  assert.equal(must(clamped(3).parse(12345)), "123");
  rejected(clamped(5).parse({ hostile: true }));
});

test("an absent optional key stays absent", () => {
  const schema = object({ a: text(), b: optional(text()) });
  const parsed = must(schema.parse({ a: "x" }));
  assert.deepEqual(Object.keys(parsed), ["a"]);
  assert.equal("b" in parsed, false);
  // an explicit null is the same as absent, not a `b: undefined` key
  assert.equal("b" in must(schema.parse({ a: "x", b: null })), false);
  assert.equal(must(schema.parse({ a: "x", b: "y" })).b, "y");
});

test("errors name the exact path that failed", () => {
  const schema = object({ steps: list(object({ stage: oneOf(["now"] as const) })) });
  const parsed = schema.parse({ steps: [{ stage: "now" }, { stage: "whenever" }] });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.error.path, "steps[1].stage");
});

test("variant narrows on its discriminant", () => {
  const schema = variant("action", { go: { d: number() }, stop: { hard: boolean() } });
  assert.deepEqual(must(schema.parse({ action: "go", d: 3 })), { d: 3, action: "go" });
  rejected(schema.parse({ action: "fly" }));
  rejected(schema.parse({ action: "go", d: "3" }));
});

test("forgivingList drops bad entries instead of failing the payload", () => {
  const schema = forgivingList(number(), { max: 2 });
  assert.deepEqual(must(schema.parse([1, "no", 2, 3])), [1, 2]);
  assert.deepEqual(must(schema.parse("not an array")), []);
});

test("brands can only be made from checked values", () => {
  assert.equal(isLatitude(91), false);
  assert.equal(isLatitude(34.05), true);
  assert.equal(toCoords(34.05, -118.24)?.lat, 34.05);
  assert.equal(toCoords(999, 0), null);
  assert.equal(dialable("call 415-555-0100 for intake"), "+14155550100");
  assert.equal(dialable("no digits here"), "");
  assert.equal(toLanguage("   "), "English");
  assert.equal(toLanguage("Español"), "Español");
});

test("situation tags are always non-empty", () => {
  assert.deepEqual(deriveTags("hello"), ["general"]);
  const tags = deriveTags("I lost my job, I'm behind on rent, and my kids are with me");
  assert.ok(tags.includes("job_loss"));
  assert.ok(tags.includes("eviction"));
  assert.ok(tags.includes("family"));
  assert.equal(Object.keys(CATEGORY_LABEL).length, 10);
});

test("KNOWN ISSUE: tag keywords match inside words, not on word boundaries", () => {
  // Documenting existing behaviour, not endorsing it: TAG_KEYWORDS is matched
  // with `includes`, so short triggers fire on longer words — "relevant"
  // contains "van", "outside" contains "id". It costs precision in the
  // learning model's signals. Left as-is here because changing the matcher
  // changes what the model learns, which is a product decision, not a typing one.
  assert.deepEqual(deriveTags("nothing relevant here"), ["vehicle"]);
  assert.ok(deriveTags("considering my options").includes("documents"));
});

test("only curated resource keys are accepted", () => {
  assert.equal(isResourceKey("crisis"), true);
  assert.equal(isResourceKey("made_up_program"), false);
  assert.equal(must(resourceKeySchema.parse("211")), "211");
  rejected(resourceKeySchema.parse("made_up_program"));
  assert.equal(RESOURCE_KEYS.length, 14);
});

const samplePath = {
  summary: "You are not alone in this.",
  steps: [{ id: "s1", title: "Call 211", stage: "now", plain: "why", action: "do this", docs: [] }],
  documents: ["State ID"],
  resources: ["211", "crisis"],
  localResources: [{ name: "Hope Center", helpsWith: "beds tonight" }],
  sources: [{ title: "Hope Center", uri: "https://example.org" }],
  tags: ["general"],
  community: { runs: 3, top: ["emergency shelter"] },
  location: "San Jose",
  createdAt: new Date().toISOString(),
};

test("a path survives the round trip through a share link", () => {
  const path = must(compassPathSchema.parse(samplePath));
  const decoded = decodePath(`#${encodePath(path)}`);
  assert.equal(decoded.ok, true);
  if (decoded.ok) assert.deepEqual(decoded.value, path);
});

test("a tampered share link is refused, not rendered", () => {
  assert.equal(decodePath("#not-base64!!!").ok, false);
  assert.equal(decodePath("").ok, false);
  // right encoding, wrong shape — still refused
  const wrongShape = btoa(encodeURIComponent(JSON.stringify({ summary: 1 })));
  assert.equal(decodePath(`#${wrongShape}`).ok, false);
});

test("stale enum values degrade instead of crashing the page", () => {
  const parsed = must(
    compassPathSchema.parse({
      ...samplePath,
      resources: ["211", "a_program_we_removed"],
      tags: ["general", "a_signal_we_renamed"],
      createdAt: "not-a-date",
    })
  );
  assert.deepEqual(parsed.resources, ["211"]);
  assert.deepEqual(parsed.tags, ["general"]);
  assert.ok(!Number.isNaN(Date.parse(parsed.createdAt)));
});

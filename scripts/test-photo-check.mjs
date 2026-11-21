// Offline tests for the Gemini photo check (fetch is stubbed). Run: node scripts/test-photo-check.mjs
import assert from "node:assert/strict";
import { checkPhoto, parseVerdict } from "../src/server/vision/gemini.ts";

const reply = (obj) => ({ candidates: [{ content: { parts: [{ text: typeof obj === "string" ? obj : JSON.stringify(obj) }] } }] });
const req = { clueId: "demo:1", clueText: "Find the station name sign", imageBase64: "AAAA", mimeType: "image/jpeg" };
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("parses a confident match", () => {
  const v = parseVerdict(reply({ matches: true, confidence: 0.9, reason: "That's the sign!" }));
  assert.deepEqual(v, { enabled: true, passed: true, confidence: 0.9, reason: "That's the sign!" });
});
test("low confidence match does not pass", () => assert.equal(parseVerdict(reply({ matches: true, confidence: 0.3 })).passed, false));
test("fenced JSON is accepted", () => assert.equal(parseVerdict(reply('```json\n{"matches":false,"confidence":0.8}\n```')).passed, false));
test("garbage yields null", () => {
  assert.equal(parseVerdict(reply("I think so?")), null);
  assert.equal(parseVerdict({}), null);
  assert.equal(parseVerdict(reply({ confidence: 1 })), null);
});
test("disabled without a key", async () => {
  delete process.env.GEMINI_API_KEY;
  assert.equal((await checkPhoto(req)).enabled, false);
});
test("sends key in header, image inline, JSON mode", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url: String(url), init }; return new Response(JSON.stringify(reply({ matches: true, confidence: 0.75 }))); };
  const v = await checkPhoto(req);
  assert.equal(v.passed, true);
  assert.match(seen.url, /models\/gemini-[^:]+:generateContent$/);
  assert.ok(!seen.url.includes("test-key"));
  assert.equal(seen.init.headers["x-goog-api-key"], "test-key");
  const body = JSON.parse(seen.init.body);
  assert.equal(body.contents[0].parts[1].inline_data.data, "AAAA");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
});
test("HTTP error falls back to tap-to-confirm", async () => {
  globalThis.fetch = async () => new Response("quota", { status: 429 });
  const orig = console.error; console.error = () => {};
  const v = await checkPhoto(req);
  console.error = orig;
  assert.equal(v.enabled, false); assert.equal(v.passed, null);
});

let failed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`PASS  ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);

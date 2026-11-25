import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { runExercise } from "./demo.js";

test("discovers, verifies, and uses the skill to draft a patch", async () => {
  const { trace, patch, skill, files } = await runExercise();
  assert.deepEqual(trace.map(({ request }) => request.method), [
    "server/discover", "skills/list", "skills/get", "resources/read", "tools/list", "tools/call",
  ]);
  assert.match(skill, /inspect_sample_repository/);
  assert.match(patch, /\+\+\+ b\/AGENTS.md/);
  assert.match(patch, /npm install/);
  assert.match(patch, /node --test/);
  assert.ok(patch.endsWith("\n"));
  assert.equal(files["AGENTS.md"], undefined);
});

test("stdio serves the exact browser trace and rejects ad hoc paths", async () => {
  const { trace } = await runExercise();
  const requests = trace.map(({ request }) => request);
  const invalid = structuredClone(requests.at(-1));
  invalid.params.arguments = { path: "../private" };
  requests.push(invalid);
  const server = spawnSync(process.execPath, [new URL("./server.js", import.meta.url).pathname], {
    input: requests.map((value) => JSON.stringify(value)).join("\n") + "\n",
    encoding: "utf8",
  });
  assert.equal(server.status, 0, server.stderr);
  const responses = server.stdout.trim().split("\n").map(JSON.parse);
  assert.deepEqual(responses.slice(0, -1), trace.map(({ response }) => response));
  assert.equal(responses.at(-1).error.code, -32602);
});

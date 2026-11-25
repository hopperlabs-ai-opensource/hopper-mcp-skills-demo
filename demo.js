export const VERSION = "2026-07-28";
export const EXTENSION = "io.modelcontextprotocol/skills";
export const SKILL_URI = "skill://check-repository/SKILL.md";
export const TOOL_NAME = "inspect_sample_repository";

const frontmatter = {
  name: "check-repository",
  description: "Review the bundled example repo and propose an AGENTS.md using its documented test command.",
};
export const SKILL = `---
name: ${frontmatter.name}
description: ${frontmatter.description}
---

# Check the sample repository

1. Call ${TOOL_NAME} with no arguments.
2. Use its README and package scripts as evidence for the setup and test commands.
3. Return a proposed AGENTS.md patch. Leave files alone.
4. Say which commands were read and which, if any, were actually run.
`;

export const SAMPLE = Object.freeze({
  "README.md": "# Sample counter\n\nInstall with npm ci. Run npm test to check it.\n",
  "package.json": '{ "scripts": { "test": "node --test" } }',
  "counter.js": "export const increment = (n) => n + 1;",
});

const tool = {
  name: TOOL_NAME,
  description: "Read the repository files bundled with this demonstration.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
};
const resource = { uri: SKILL_URI, ...frontmatter, mimeType: "text/markdown" };
const capabilities = { tools: {}, resources: {}, extensions: { [EXTENSION]: {} } };
const serverInfo = { name: "hopper-repo-skill", version: "1.0.0" };
const encoder = new TextEncoder();

async function digest(value) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return "sha256:" + Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function skillEntry() {
  return {
    uri: SKILL_URI,
    frontmatter,
    resources: [{ uri: SKILL_URI, digest: await digest(SKILL), size: encoder.encode(SKILL).length }],
  };
}

export async function respond(message) {
  const id = message?.id ?? null;
  const error = (code, text) => ({ jsonrpc: "2.0", id, error: { code, message: text } });
  if (message?.jsonrpc !== "2.0" || typeof message?.method !== "string") return error(-32600, "Invalid request");
  if (message.id === undefined) return undefined;
  if (typeof id !== "number" && typeof id !== "string") return error(-32600, "Invalid request id");
  const params = message.params ?? {};
  const meta = params._meta;
  if (meta?.["io.modelcontextprotocol/protocolVersion"] !== VERSION ||
      !meta["io.modelcontextprotocol/clientCapabilities"] ||
      typeof meta["io.modelcontextprotocol/clientCapabilities"] !== "object") {
    return error(-32602, "Use MCP 2026-07-28 per-request metadata");
  }
  const complete = (result = {}) => ({
    jsonrpc: "2.0",
    id,
    result: { resultType: "complete", ...result, _meta: { "io.modelcontextprotocol/serverInfo": serverInfo } },
  });
  switch (message.method) {
    case "ping": return complete();
    case "server/discover": return complete({ supportedVersions: [VERSION], capabilities });
    case "skills/list": return complete({ skills: [await skillEntry()] });
    case "skills/get":
      return params.uri === SKILL_URI ? complete({ skill: await skillEntry() }) : error(-32602, "Unknown skill");
    case "resources/list": return complete({ resources: [resource] });
    case "resources/read":
      return params.uri === SKILL_URI
        ? complete({ contents: [{ uri: SKILL_URI, mimeType: resource.mimeType, text: SKILL }] })
        : error(-32602, "Unknown resource");
    case "tools/list": return complete({ tools: [tool] });
    case "tools/call":
      if (params.name !== TOOL_NAME || (params.arguments !== undefined &&
          (!params.arguments || typeof params.arguments !== "object" || Array.isArray(params.arguments) || Object.keys(params.arguments).length))) {
        return error(-32602, "The sample inspection takes no arguments");
      }
      return complete({ content: [{ type: "text", text: JSON.stringify(SAMPLE, null, 2) }] });
    default: return error(-32601, "Method not found");
  }
}

export async function runExercise() {
  const trace = [];
  async function call(method, args = {}) {
    const request = {
      jsonrpc: "2.0",
      id: trace.length + 1,
      method,
      params: {
        ...args,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": VERSION,
          "io.modelcontextprotocol/clientCapabilities": { extensions: { [EXTENSION]: {} } },
        },
      },
    };
    const response = await respond(request);
    if (response.error) throw new Error(response.error.message);
    trace.push({ request, response });
    return response.result;
  }

  const discovery = await call("server/discover");
  if (!(EXTENSION in discovery.capabilities.extensions)) throw new Error("Skills capability missing");
  const { skills } = await call("skills/list");
  const { skill } = await call("skills/get", { uri: skills[0].uri });
  const { contents } = await call("resources/read", { uri: skill.uri });
  if (await digest(contents[0].text) !== skill.resources[0].digest) throw new Error("Skill digest mismatch");
  const { tools } = await call("tools/list");
  const { content } = await call("tools/call", { name: tools[0].name, arguments: {} });
  const files = JSON.parse(content[0].text);
  const test = JSON.parse(files["package.json"]).scripts.test;
  const setup = files["README.md"].match(/Install with (.+?)\./)?.[1];
  const patch = [
    "--- /dev/null", "+++ b/AGENTS.md", "@@ -0,0 +1,5 @@", "+# Repository instructions", "+",
    `+- Install dependencies with \`${setup}\`.`,
    "+- Run `npm test` before handing off a change.",
    `+- The test script runs \`${test}\`.`,
  ].join("\n");
  return { trace, patch, skill: contents[0].text, files };
}

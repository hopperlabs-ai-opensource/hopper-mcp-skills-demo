# Hopper Labs Skills over MCP demo

Serve one inspectable skill and a read-only sample repository over MCP revision
2026-07-28. The browser exercise and this stdio server use the same request
handler. The fixture lives in memory and the server accepts no file paths.

## Run it

Use Node.js 22 or later. Run `npm test` to verify the skill digest, sample patch
and stdio exchange. This demo has no npm dependencies.

In a recent interactive Claude Code session with MCP skills enabled, register
the process from this checkout:

```sh
claude mcp add --transport stdio hopper-repo-skill -- node "$PWD/server.js"
```

Start or restart the session, check `/mcp` and `/skills`, and ask Claude to use the
check-repository skill to propose an AGENTS.md patch for the bundled sample.
Alternatively, run this deterministic exercise from the repo root:

```sh
node --input-type=module -e 'import {runExercise} from "./demo.js"; console.log((await runExercise()).patch)'
```

- [Hopper Patterns guide](https://patterns.hopperlabs.ai/patterns/skills-over-mcp)
- [Hopper Lab exercise](https://lab.hopperlabs.ai/labs/skills-over-mcp/run)
- [MCP Skills extension](https://modelcontextprotocol.io/extensions/skills/overview)

The deterministic exercise reads the fixture and produces a patch. It leaves the
filesystem and sample commands alone. The stdio server implements the methods
needed for this lesson using the 2026-07-28 request envelope.

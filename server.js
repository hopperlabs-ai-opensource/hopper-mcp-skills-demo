import { createInterface } from "node:readline";
import { respond } from "./demo.js";

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of lines) {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" },
    }) + "\n");
    continue;
  }
  const response = await respond(request);
  if (response) process.stdout.write(JSON.stringify(response) + "\n");
}

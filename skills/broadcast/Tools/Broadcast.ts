#!/usr/bin/env bun
import { createInterface } from "node:readline/promises";
import { runBroadcast } from "../src/broadcast";

if (import.meta.main) {
  let terminal: ReturnType<typeof createInterface> | undefined;
  try {
    process.exitCode = await runBroadcast({
      args: Bun.argv.slice(2),
      env: process.env,
      interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      write: text => process.stdout.write(`${text}\n`),
      confirm: prompt => {
        terminal ??= createInterface({ input: process.stdin, output: process.stdout });
        return terminal.question(prompt);
      },
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Broadcast failed"}\n`);
    process.exitCode = 1;
  } finally {
    terminal?.close();
  }
}

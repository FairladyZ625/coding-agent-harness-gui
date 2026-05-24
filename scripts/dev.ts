import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "server"], { stdio: "inherit" }),
  spawn("npm", ["exec", "vite", "--", "--host", "127.0.0.1", "--port", "5177"], { stdio: "inherit" })
];

let shuttingDown = false;

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const sibling of children) {
      if (sibling !== child) sibling.kill("SIGTERM");
    }
    console.error(`dev child exited unexpectedly: ${signal ?? code ?? "unknown"}`);
    process.exit(code ?? 1);
  });
}

function shutdown() {
  shuttingDown = true;
  for (const child of children) child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

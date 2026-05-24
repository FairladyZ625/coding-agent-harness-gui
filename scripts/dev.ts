import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "server"], { stdio: "inherit" }),
  spawn("npm", ["exec", "vite", "--", "--host", "127.0.0.1", "--port", "5177"], { stdio: "inherit" })
];

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

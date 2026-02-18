import { spawn } from "node:child_process";

const running = [];
let shuttingDown = false;

function runProcess(name, command) {
  const child = spawn(command, { stdio: "inherit", shell: true });
  running.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    const exitCode = typeof code === "number" ? code : signal ? 1 : 0;
    console.error(`${name} exited${signal ? ` (${signal})` : ""}.`);
    shutdown(exitCode);
  });
  return child;
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  running.forEach((child) => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  });
  setTimeout(() => {
    running.forEach((child) => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    });
    process.exit(exitCode);
  }, 400);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

runProcess("component-manifest-watch", "npm run sync:components:watch");
runProcess("vite-dev-server", "npm --prefix ../.. run dev -- --host");

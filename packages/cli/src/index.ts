#!/usr/bin/env node

import { Command } from "commander";
import open from "open";
import ora from "ora";
import { execSync, spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { createServer } from "net";

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : startPort;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);
  if (major < 20) {
    console.error(`repocast requires Node.js 20+. You have ${version}.`);
    process.exit(1);
  }
}

const program = new Command();

program
  .name("repocast")
  .description("Any GitHub repo. Explained. Aloud.")
  .version("0.1.0")
  .argument("[url]", "GitHub repository URL (e.g., https://github.com/owner/repo)")
  .action(async (url?: string) => {
    checkNodeVersion();

    const spinner = ora("Starting repocast...").start();

    const port = await findAvailablePort(3847);

    const webDir = resolve(__dirname, "..", "..", "apps", "web");
    if (!existsSync(join(webDir, "package.json"))) {
      spinner.fail(
        "Web app not found. Run from the repocast repository root, or use: pnpm dev"
      );
      process.exit(1);
    }

    const serverProcess = spawn("npx", ["next", "start", "-p", String(port)], {
      cwd: webDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port) },
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (text.includes("Ready")) {
        spinner.succeed(`repocast running on http://localhost:${port}`);

        let targetUrl = `http://localhost:${port}`;
        if (url) {
          const match = url.match(
            /(?:https?:\/\/github\.com\/)?([^/]+)\/([^/]+)/
          );
          if (match) {
            targetUrl = `http://localhost:${port}/${match[1]}/${match[2]}`;
          }
        }

        open(targetUrl);
        console.log(`\nOpened ${targetUrl}`);
        console.log("Press Ctrl+C to stop.\n");
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      if (!text.includes("ExperimentalWarning")) {
        process.stderr.write(text);
      }
    });

    process.on("SIGINT", () => {
      console.log("\nStopping repocast...");
      serverProcess.kill("SIGTERM");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      serverProcess.kill("SIGTERM");
      process.exit(0);
    });
  });

program.parse();

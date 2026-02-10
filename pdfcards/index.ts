#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { createHash } from "crypto";
import { spawn } from "child_process";
import { homedir } from "os";

function getHighlightsDir(): string {
  const dir = join(homedir(), ".config", "pdfx", "highlights");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getHighlightsPath(pdfPath: string): string {
  const hash = createHash("sha256").update(pdfPath).digest("hex").slice(0, 16);
  const safeName = pdfPath.split("/").pop()?.replace(/\.pdf$/i, "") || "unknown";
  return join(getHighlightsDir(), `${safeName}-${hash}.json`);
}

const PORT = 3000;

function getScriptDir(): string {
  const scriptPath = process.argv[1];
  return dirname(resolve(scriptPath));
}

function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;
  let args: string[];

  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }

  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: pdfx <file.pdf>");
    process.exit(1);
  }

  const pdfPath = resolve(args[0]);

  if (!existsSync(pdfPath)) {
    console.error(`Error: File not found: ${pdfPath}`);
    process.exit(1);
  }

  if (!pdfPath.toLowerCase().endsWith(".pdf")) {
    console.error("Error: File must be a PDF");
    process.exit(1);
  }

  const scriptDir = getScriptDir();
  const viewerPath = join(scriptDir, "viewer.html");
  const pdfjsDir = join(scriptDir, "node_modules", "pdfjs-dist", "build");
  const pdfjsCssDir = join(scriptDir, "node_modules", "pdfjs-dist", "web");
  const highlightsPath = getHighlightsPath(pdfPath);

  const pdfContent = readFileSync(pdfPath);
  const viewerContent = readFileSync(viewerPath, "utf-8");

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      if (path === "/" || path === "/viewer") {
        return new Response(viewerContent, {
          headers: { "Content-Type": "text/html" },
        });
      }

      if (path === "/pdf") {
        return new Response(pdfContent, {
          headers: { "Content-Type": "application/pdf" },
        });
      }

      if (path === "/highlights") {
        if (req.method === "GET") {
          if (existsSync(highlightsPath)) {
            const content = readFileSync(highlightsPath, "utf-8");
            return new Response(content, {
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ highlights: [] }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (req.method === "POST") {
          const body = await req.json();
          writeFileSync(highlightsPath, JSON.stringify(body, null, 2));
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (path.startsWith("/pdfjs/")) {
        const filename = path.replace("/pdfjs/", "");
        const filePath = join(pdfjsDir, filename);

        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          const contentType = filename.endsWith(".mjs")
            ? "application/javascript"
            : "application/octet-stream";
          return new Response(content, {
            headers: { "Content-Type": contentType },
          });
        }
      }

      if (path.startsWith("/pdfjs-css/")) {
        const filename = path.replace("/pdfjs-css/", "");
        const filePath = join(pdfjsCssDir, filename);

        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          return new Response(content, {
            headers: { "Content-Type": "text/css" },
          });
        }
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`PDF Viewer running at http://localhost:${PORT}`);
  console.log(`Viewing: ${pdfPath}`);
  console.log("Press Ctrl+C to stop");

  openBrowser(`http://localhost:${PORT}`);
}

main();

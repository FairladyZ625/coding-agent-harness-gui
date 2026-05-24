import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { addProject, loadRegistry, removeProject, sanitizeRegistry, updateProjectEnabled } from "./registry";
import { buildPortfolio, confirmReviewPreview, fileUrlForLocalPath, getTaskDetail, getTaskMaterial, scanProject } from "./scanner";
import { assertIndexSafePayload } from "../model/harnessGui";

const port = Number(process.env.HARNESS_GUI_API_PORT ?? 4177);

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
}

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/snapshot") {
    const snapshot = await buildPortfolio(loadRegistry());
    assertIndexSafePayload(snapshot);
    sendJson(res, 200, snapshot);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/projects") {
    sendJson(res, 200, sanitizeRegistry(loadRegistry()));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/projects") {
    const body = await readJson(req);
    sendJson(res, 201, sanitizeRegistry(addProject(String(body.path ?? ""))));
    return;
  }
  const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (req.method === "DELETE" && projectMatch) {
    sendJson(res, 200, sanitizeRegistry(removeProject(projectMatch[1])));
    return;
  }
  const projectEnableMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/enabled$/);
  if (req.method === "PATCH" && projectEnableMatch) {
    const body = await readJson(req);
    sendJson(res, 200, sanitizeRegistry(updateProjectEnabled(projectEnableMatch[1], Boolean(body.enabled))));
    return;
  }
  const scanMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/scan$/);
  if (req.method === "POST" && scanMatch) {
    const project = loadRegistry().find((candidate) => candidate.id === scanMatch[1]);
    if (!project) return sendJson(res, 404, { error: "project not found" });
    sendJson(res, 200, await scanProject(project));
    return;
  }
  const tasksMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/tasks$/);
  if (req.method === "GET" && tasksMatch) {
    const snapshot = await buildPortfolio(loadRegistry());
    sendJson(res, 200, snapshot.tasks.filter((task) => task.projectId === tasksMatch[1]));
    return;
  }
  const taskMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/tasks\/([^/]+)$/);
  if (req.method === "GET" && taskMatch) {
    const detail = await getTaskDetail(loadRegistry(), taskMatch[1], decodeURIComponent(taskMatch[2]));
    if (!detail) return sendJson(res, 404, { error: "task not found" });
    sendJson(res, 200, detail);
    return;
  }
  const evidenceMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/evidence$/);
  if (req.method === "GET" && evidenceMatch) {
    const snapshot = await buildPortfolio(loadRegistry());
    sendJson(res, 200, snapshot.evidence.filter((entry) => entry.projectId === evidenceMatch[1]));
    return;
  }
  const materialMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/materials\/(.+)$/);
  if (req.method === "GET" && materialMatch) {
    const material = await getTaskMaterial(loadRegistry(), materialMatch[1], decodeURIComponent(materialMatch[2]), decodeURIComponent(materialMatch[3]));
    if (!material) return sendJson(res, 404, { error: "material not found" });
    sendJson(res, 200, material);
    return;
  }
  const openMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/files\/open$/);
  if (req.method === "POST" && openMatch) {
    const body = await readJson(req);
    const targetPath = String(body.path ?? "");
    const project = loadRegistry().find((candidate) => candidate.id === openMatch[1]);
    if (!project) return sendJson(res, 404, { error: "project not found" });
    const resolved = path.resolve(project.path, targetPath);
    const root = path.resolve(project.path);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return sendJson(res, 403, { error: "path escapes project" });
    sendJson(res, 200, { ok: fs.existsSync(resolved), path: resolved, url: fileUrlForLocalPath(resolved) });
    return;
  }
  const confirmMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/reviews\/([^/]+)\/confirm$/);
  if (req.method === "POST" && confirmMatch) {
    const body = await readJson(req);
    const result = await confirmReviewPreview(
      loadRegistry(),
      confirmMatch[1],
      decodeURIComponent(confirmMatch[2]),
      String(body.sourceSnapshotHash ?? "")
    );
    sendJson(res, result.status, result);
    return;
  }
  sendJson(res, 404, { error: "not found" });
}

function sendJson(res: http.ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "http://127.0.0.1:5177"
  });
  res.end(JSON.stringify(value));
}

async function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`Harness GUI API listening on http://127.0.0.1:${port}`);
  });
}

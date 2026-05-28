import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ActionDescriptor,
  DataClass,
  EvidenceEntry,
  PortfolioSnapshot,
  ProjectSummary,
  QueueKey,
  TaskDetail,
  TaskMaterial,
  TaskSummary,
  emptyQueueCounts,
  queueToCountKey,
  schemaVersion
} from "../model/harnessGui";
import { aggregateQueueCounts, createSyntheticPortfolio, taskToQueueItems } from "../fixtures/portfolio";

export const scannerVersion = "harness-gui-local-scanner/1";

export interface RegisteredProject {
  id: string;
  displayName: string;
  path: string;
  enabled?: boolean;
  dataClass?: DataClass;
  lastScanAt?: string;
  synthetic?: boolean;
}

export interface ScanResult {
  project: ProjectSummary;
  tasks: TaskSummary[];
  evidence: EvidenceEntry[];
  actions: ActionDescriptor[];
  markdownFileCount: number;
  docsBytes: number;
  errors: string[];
}

const contractFiles = [
  "brief.md",
  "task_plan.md",
  "execution_strategy.md",
  "long-running-task-contract.md",
  "visual_map.md",
  "progress.md",
  "review.md",
  "findings.md",
  "lesson_candidates.md",
  "references/INDEX.md",
  "artifacts/INDEX.md"
];

export function defaultProjects(): RegisteredProject[] {
  return [
    {
      id: "coding-agent-harness",
      displayName: "Coding Agent Harness",
      path: path.resolve("..")
    }
  ];
}

export async function buildPortfolio(projects: RegisteredProject[] = defaultProjects()): Promise<PortfolioSnapshot> {
  const scanResults = await runWithConcurrency(projects.filter((project) => project.enabled !== false), 3, scanProject);
  const realProjects = scanResults.map((result) => result.project);
  const tasks = scanResults.flatMap((result) => result.tasks).map(sanitizeTaskForGlobal);
  const evidence = scanResults.flatMap((result) => result.evidence).map(sanitizeEvidenceForGlobal);
  const actions = scanResults.flatMap((result) => result.actions).map(sanitizeActionForGlobal);

  return {
    schemaVersion,
    generatedAt: new Date().toISOString(),
    scannerVersion,
    portfolio: {
      projectCount: realProjects.length,
      taskCount: tasks.length,
      evidenceCount: evidence.length,
      queueCounts: aggregateQueueCounts(tasks)
    },
    projects: realProjects,
    queues: tasks.flatMap(taskToQueueItems),
    tasks,
    evidence,
    actions
  };
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function scanProject(project: RegisteredProject): Promise<ScanResult> {
  const started = performance.now();
  const projectPath = path.resolve(project.path);
  const errors: string[] = [];
  if (!fs.existsSync(projectPath)) {
    return missingProject(project, "Project path does not exist");
  }
  const docsRoot = resolveDocsRoot(projectPath);
  if (!docsRoot) {
    return missingProject(project, "No Harness docs root found");
  }

  const taskDirs = listTaskDirectories(docsRoot);
  const tasks = taskDirs.map((taskDir) => buildTask(project, projectPath, docsRoot, taskDir));
  const evidence = tasks.flatMap((task) => buildEvidenceForTask(task));
  const actions = tasks.flatMap((task) => buildActionsForTask(task));
  const counts = aggregateQueueCounts(tasks);
  const moduleSummary: Record<string, number> = {};
  for (const task of tasks) {
    if (!task.moduleKey) continue;
    moduleSummary[task.moduleKey] = (moduleSummary[task.moduleKey] ?? 0) + 1;
  }
  const markdown = listMarkdownFiles(docsRoot);
  const docsBytes = markdown.reduce((sum, file) => sum + safeStatSize(file), 0);
  const missingCount = counts.missingMaterials;
  const blockedCount = counts.blocked + counts.reviewBlocked;
  const status = blockedCount > 0 ? "failing" : missingCount > 0 ? "warning" : "passing";
  const projectSummary: ProjectSummary = {
    id: project.id,
    displayName: project.displayName,
    path: `project:${project.id}`,
    dataClass: "index-safe",
    health: {
      status,
      warnings: missingCount,
      failures: blockedCount,
      summary: `${tasks.length} tasks, ${counts.reviewNeeded} ready reviews, ${missingCount} missing material packets`
    },
    queueCounts: counts,
    moduleSummary,
    lastScanAt: new Date().toISOString(),
    staleState: errors.length ? "error" : "fresh",
    staleReason: errors.join("; ") || undefined,
    taskCount: tasks.length,
    evidenceCount: evidence.length
  };

  return {
    project: projectSummary,
    tasks,
    evidence,
    actions,
    markdownFileCount: markdown.length,
    docsBytes,
    errors
  };
}

export async function getTaskDetail(projects: RegisteredProject[], projectId: string, taskKey: string): Promise<TaskDetail | undefined> {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) {
    const synthetic = createSyntheticPortfolio(15);
    const task = synthetic.tasks.find((candidate) => candidate.projectId === projectId && candidate.taskKey === taskKey);
    if (!task) return undefined;
    return {
      ...task,
      contractFiles: synthetic.evidence.filter((entry) => entry.projectId === projectId && entry.taskKey === taskKey),
      materials: synthetic.evidence
        .filter((entry) => entry.projectId === projectId && entry.taskKey === taskKey)
        .map((entry) => evidenceToMaterial(entry, task.sourceFileHashes[path.basename(entry.sourcePath)])),
      artifactCount: 0,
      findingCount: 0,
      reviewGate: {
        canConfirm: task.queues.includes("review-needed") && task.staleState === "fresh",
        previewOnly: true,
        reason: "Synthetic fixture detail; CLI confirm is not connected in V1.",
        displayedHash: task.sourceSnapshotHash
      }
    };
  }
  const scan = await scanProject(project);
  const task = scan.tasks.find((candidate) => candidate.projectId === projectId && candidate.taskKey === taskKey);
  if (!task) return undefined;
  const contractFiles = scan.evidence.filter((entry) => entry.projectId === projectId && entry.taskKey === taskKey);
  const materials = buildMaterialsForTask(project.path, task);
  const canConfirm = task.queues.includes("review-needed") && task.staleState === "fresh";
  return {
    ...task,
    contractFiles,
    materials,
    artifactCount: materials.filter((material) => material.type === "artifact").length,
    findingCount: countFindingRows(path.join(findTaskDirectory(project.path, task.taskKey) ?? "", "findings.md")),
    reviewGate: {
      canConfirm,
      previewOnly: true,
      reason: canConfirm
        ? "Target hash is fresh; Harness CLI confirm is intentionally disabled in V1 preview."
        : "Task is stale or not in Review Needed; refresh the project before action.",
      displayedHash: task.sourceSnapshotHash
    }
  };
}

export async function getTaskMaterial(
  projects: RegisteredProject[],
  projectId: string,
  taskKey: string,
  materialName: string
): Promise<TaskMaterial | undefined> {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return undefined;
  const taskDir = findTaskDirectory(project.path, taskKey);
  if (!taskDir) return undefined;
  const safeName = contractFiles.find((candidate) => candidate === materialName);
  if (!safeName) return undefined;
  const fullPath = path.join(taskDir, safeName);
  if (!fs.existsSync(fullPath)) return { id: `${projectId}:${taskKey}:${safeName}`, name: safeName, type: evidenceType(safeName), sourcePath: `task:${taskKey}/${safeName}`, dataClass: "index-safe", status: "missing" };
  return {
    id: `${projectId}:${taskKey}:${safeName}`,
    name: safeName,
    type: evidenceType(safeName),
    sourcePath: `task:${taskKey}/${safeName}`,
    dataClass: "sensitive-on-demand",
    status: "present",
    hash: hashText(readIfExists(fullPath)),
    snippet: redactSnippet(readIfExists(fullPath))
  };
}

function sanitizeTaskForGlobal(task: TaskSummary): TaskSummary {
  return {
    ...task,
    title: task.taskKey,
    projectPath: task.projectId,
    currentPath: `task:${task.taskKey}`,
    repairPrompt: `Open task ${task.taskKey} and resolve: ${task.queues.join(", ")}.`
  };
}

function sanitizeEvidenceForGlobal(entry: EvidenceEntry): EvidenceEntry {
  return {
    ...entry,
    title: entry.type,
    sourcePath: entry.taskKey ? `task:${entry.taskKey}/${path.basename(entry.sourcePath)}` : "project:evidence"
  };
}

function sanitizeActionForGlobal(action: ActionDescriptor): ActionDescriptor {
  return {
    ...action,
    reason: action.previewOnly ? action.reason : undefined
  };
}

export async function confirmReviewPreview(
  projects: RegisteredProject[],
  projectId: string,
  taskKey: string,
  displayedHash: string
) {
  const detail = await getTaskDetail(projects, projectId, taskKey);
  if (!detail) {
    return { ok: false, status: 404, message: "Task not found" };
  }
  if (detail.sourceSnapshotHash !== displayedHash) {
    return { ok: false, status: 409, message: "Source hash changed. Refresh the task before confirming." };
  }
  if (!detail.reviewGate.canConfirm) {
    return { ok: false, status: 409, message: detail.reviewGate.reason };
  }
  return {
    ok: false,
    status: 501,
    message: "Review confirm is preview-only in V1 until Harness CLI/core action is connected."
  };
}

function resolveDocsRoot(projectPath: string): string | undefined {
  for (const candidate of [
    path.join(projectPath, ".harness-private", "docs"),
    path.join(projectPath, "docs")
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function listTaskDirectories(docsRoot: string): string[] {
  const roots = [
    path.join(docsRoot, "09-PLANNING", "TASKS"),
    path.join(docsRoot, "09-PLANNING", "MODULES")
  ];
  const dirs: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    walk(root, (file) => {
      if (path.basename(file) === "task_plan.md") dirs.push(path.dirname(file));
    });
  }
  return dirs
    .filter((dir) => !hasPathSegment(dir, "_task-template"))
    .filter((dir) => !hasPathSegment(dir, "_archive"))
    .sort();
}

function buildTask(project: RegisteredProject, projectPath: string, docsRoot: string, taskDir: string): TaskSummary {
  const generatedAt = new Date().toISOString();
  const relativeTaskDir = toPosix(path.relative(projectPath, taskDir));
  const taskKey = relativeTaskDir.split("/").slice(-1)[0];
  const sourceFileHashes = hashKnownFiles(taskDir);
  const sourceSnapshotHash = hashObject(sourceFileHashes);
  const moduleKey = moduleKeyFromPath(relativeTaskDir);
  const title = titleFromPlan(taskDir, taskKey);
  const materialsReady = requiredMaterialsReady(taskDir);
  const reviewText = readIfExists(path.join(taskDir, "review.md"));
  const progressText = readIfExists(path.join(taskDir, "progress.md"));
  const findingsText = readIfExists(path.join(taskDir, "findings.md"));
  const taskPlanText = readIfExists(path.join(taskDir, "task_plan.md"));
  const archive = parseTaskTombstone(taskPlanText);
  const lifecycleState = inferLifecycle(progressText, relativeTaskDir);
  const reviewStatus = inferReviewStatus(reviewText);
  const queues = inferQueues({ materialsReady, reviewStatus, lifecycleState, findingsText, progressText, archiveState: archive.archiveState });
  const queueReasons = queues.map((queue) => reasonForQueue(queue));

  return {
    id: taskKey,
    taskKey,
    title,
    projectId: project.id,
    projectPath: project.id,
    currentPath: `task:${taskKey}`,
    moduleKey,
    lifecycleState,
    reviewStatus,
    materialsReady,
    queues,
    queueReasons,
    repairPrompt: `Open task ${taskKey}, resolve ${queues.join(", ")}, then rerun Harness checks.`,
    sourceFileHashes,
    sourceSnapshotHash,
    scannerVersion,
    generatedAt,
    staleState: "fresh",
    evidenceCount: contractFiles.filter((file) => fs.existsSync(path.join(taskDir, file))).length,
    dataClass: "index-safe",
    ...archive
  };
}

function buildEvidenceForTask(task: TaskSummary): EvidenceEntry[] {
  return contractFiles
    .filter((file) => task.sourceFileHashes[file])
    .map((file) => ({
      id: `${task.projectId}:${task.taskKey}:${file}`,
      projectId: task.projectId,
      taskKey: task.taskKey,
      title: file,
      type: evidenceType(file),
      sourcePath: `task:${task.taskKey}/${file}`,
      dataClass: "index-safe",
      sourceSnapshotHash: task.sourceSnapshotHash
    }));
}

function buildMaterialsForTask(projectPath: string, task: TaskSummary): TaskMaterial[] {
  const taskDir = findTaskDirectory(projectPath, task.taskKey);
  return contractFiles.map((file) => {
    const fullPath = taskDir ? path.join(taskDir, file) : "";
    const present = Boolean(fullPath && fs.existsSync(fullPath));
    return {
      id: `${task.projectId}:${task.taskKey}:${file}`,
      name: file,
      type: evidenceType(file),
      sourcePath: `task:${task.taskKey}/${file}`,
      dataClass: present ? "sensitive-on-demand" : "index-safe",
      status: present ? "present" : "missing",
      hash: task.sourceFileHashes[file]
    };
  });
}

function evidenceToMaterial(entry: EvidenceEntry, hash?: string): TaskMaterial {
  return {
    id: entry.id,
    name: path.basename(entry.sourcePath),
    type: entry.type,
    sourcePath: entry.sourcePath,
    dataClass: "index-safe",
    status: "present",
    hash
  };
}

function buildActionsForTask(task: TaskSummary): ActionDescriptor[] {
  return [
    {
      id: `${task.projectId}:${task.taskKey}:open`,
      projectId: task.projectId,
      taskKey: task.taskKey,
      kind: "open-path",
      label: "Open task folder",
      enabled: true,
      previewOnly: false,
      sourceSnapshotHash: task.sourceSnapshotHash
    },
    {
      id: `${task.projectId}:${task.taskKey}:copy-repair`,
      projectId: task.projectId,
      taskKey: task.taskKey,
      kind: "copy-repair-prompt",
      label: "Copy repair prompt",
      enabled: Boolean(task.repairPrompt),
      previewOnly: false,
      sourceSnapshotHash: task.sourceSnapshotHash
    },
    {
      id: `${task.projectId}:${task.taskKey}:review-confirm`,
      projectId: task.projectId,
      taskKey: task.taskKey,
      kind: "review-confirm",
      label: "Confirm review",
      enabled: task.queues.includes("review-needed") && task.staleState === "fresh",
      previewOnly: true,
      reason: "Disabled as a real write until Harness CLI/core confirm action exists.",
      sourceSnapshotHash: task.sourceSnapshotHash,
      sourceFileHashes: task.sourceFileHashes
    }
  ];
}

function inferQueues(input: {
  materialsReady: boolean;
  reviewStatus: string;
  lifecycleState: string;
  findingsText: string;
  progressText: string;
  archiveState?: string;
}): QueueKey[] {
  const queues = new Set<QueueKey>();
  if (input.archiveState === "archived") return ["archived"];
  if (!input.materialsReady) queues.add("missing-materials");
  if (/blocked|pause|暂停|阻塞/i.test(input.lifecycleState) || /blocked|P0|P1|阻塞/i.test(input.findingsText)) {
    queues.add(input.reviewStatus === "ready" ? "review-blocked" : "blocked");
  }
  if (input.reviewStatus === "ready" && !queues.has("review-blocked")) queues.add("review-needed");
  if (/lesson/i.test(input.progressText)) queues.add("lesson-candidate");
  if (queues.size === 0) queues.add(input.lifecycleState === "done" ? "closed" : "active");
  return [...queues];
}

function reasonForQueue(queue: QueueKey): string {
  return {
    "review-needed": "Review material appears ready and needs human confirmation.",
    "review-blocked": "Review packet exists but a blocking finding or stale condition is present.",
    blocked: "Task progress or findings indicate blocked work.",
    "missing-materials": "Required task contract or evidence files are missing.",
    "lesson-candidate": "Lesson candidates exist and need a governance decision.",
    active: "Task is active without a higher-priority attention queue.",
    closed: "Task appears closed and is shown read-only.",
    archived: "Task is archived under a release or retention bucket."
  }[queue];
}

function parseTaskTombstone(taskPlanText: string): Pick<TaskSummary, "archiveState" | "archiveBucket" | "archivedBy" | "archivedAt" | "reviewConfirmedBy" | "reviewConfirmedAt" | "reviewConfirmationId" | "releasePackage"> {
  const match = taskPlanText.match(/^##\s*(?:Task Tombstone|任务墓碑)\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/im);
  if (!match) return { archiveState: "active" };
  const fields = fieldsFromMarkdownBlock(match[1] || "");
  const state = normalizeField(fields.get("state")) || "soft-deleted";
  return {
    archiveState: state === "archived" || state === "soft-deleted" || state === "superseded" ? state : "soft-deleted",
    archiveBucket: fields.get("retention bucket") || "",
    archivedBy: fields.get("archived by") || "",
    archivedAt: fields.get("archived at") || "",
    reviewConfirmedBy: fields.get("review confirmed by") || "",
    reviewConfirmedAt: fields.get("review confirmed at") || "",
    reviewConfirmationId: fields.get("review confirmation id") || "",
    releasePackage: fields.get("release package") || ""
  };
}

function fieldsFromMarkdownBlock(block: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
    if (!match) continue;
    const key = normalizeField(match[1]);
    if (!key || key === "field" || key === "---") continue;
    fields.set(key, match[2].trim().replace(/\\\|/g, "|"));
  }
  return fields;
}

function normalizeField(value?: string): string {
  return String(value || "").trim().toLowerCase();
}

function inferLifecycle(progressText: string, taskPath: string): string {
  if (/status:\s*done|状态[:：]\s*完成|completed|complete/i.test(progressText)) return "done";
  if (/blocked|暂停|阻塞/i.test(progressText)) return "blocked";
  if (taskPath.includes("v0-design-spike")) return "done";
  return "active";
}

function inferReviewStatus(reviewText: string): string {
  if (!reviewText.trim()) return "not-submitted";
  if (/open P0|open P1|blocking|阻塞/i.test(reviewText)) return "blocked";
  if (/no open P0|no open P1|approved|pass|通过|无 open/i.test(reviewText)) return "ready";
  return "ready";
}

function requiredMaterialsReady(taskDir: string): boolean {
  return ["task_plan.md", "progress.md", "review.md"].every((file) => fs.existsSync(path.join(taskDir, file)));
}

function titleFromPlan(taskDir: string, fallback: string): string {
  const text = readIfExists(path.join(taskDir, "task_plan.md")) || readIfExists(path.join(taskDir, "brief.md"));
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback.replaceAll("-", " ");
}

function moduleKeyFromPath(relativeTaskDir: string): string | undefined {
  const match = relativeTaskDir.match(/09-PLANNING\/MODULES\/([^/]+)\//);
  return match?.[1];
}

function evidenceType(file: string): EvidenceEntry["type"] {
  if (file.includes("review")) return "review";
  if (file.includes("progress")) return "progress";
  if (file.includes("finding")) return "finding";
  if (file.includes("artifact")) return "artifact";
  if (file.includes("reference")) return "reference";
  return "contract";
}

function hashKnownFiles(taskDir: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const file of contractFiles) {
    const fullPath = path.join(taskDir, file);
    if (!fs.existsSync(fullPath)) continue;
    hashes[file] = hashText(readIfExists(fullPath));
  }
  return hashes;
}

function missingProject(project: RegisteredProject, reason: string): ScanResult {
  const counts = emptyQueueCounts();
  return {
    project: {
      id: project.id,
      displayName: project.displayName,
      path: `project:${project.id}`,
      dataClass: "index-safe",
      health: { status: "unknown", warnings: 0, failures: 1, summary: reason },
      queueCounts: counts,
      moduleSummary: {},
      lastScanAt: new Date().toISOString(),
      staleState: "missing",
      staleReason: reason,
      taskCount: 0,
      evidenceCount: 0
    },
    tasks: [],
    evidence: [],
    actions: [],
    markdownFileCount: 0,
    docsBytes: 0,
    errors: [reason]
  };
}

function findTaskDirectory(projectPath: string, taskKey: string): string | undefined {
  const docsRoot = resolveDocsRoot(path.resolve(projectPath));
  if (!docsRoot) return undefined;
  return listTaskDirectories(docsRoot).find((taskDir) => path.basename(taskDir) === taskKey);
}

function countFindingRows(findingsPath: string): number {
  const text = readIfExists(findingsPath);
  return text.split("\n").filter((line) => /^\|\s*R?F?-\d+/i.test(line)).length;
}

function redactSnippet(text: string): string {
  return text
    .slice(0, 1600)
    .replace(/Task Contract:[^\n]*/g, "[redacted-private-marker]")
    .replace(/PRIVATE:[^\s)]+/g, "[redacted-private-marker]")
    .replace(/\.harness-private/g, "[redacted-private-marker]")
    .replace(/##\s*步骤/g, "## [redacted-private-marker]");
}

function listMarkdownFiles(root: string): string[] {
  const files: string[] = [];
  walk(root, (file) => {
    if (file.endsWith(".md")) files.push(file);
  });
  return files;
}

function walk(root: string, visitor: (file: string) => void): void {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(fullPath, visitor);
    } else {
      visitor(fullPath);
    }
  }
}

function safeStatSize(file: string): number {
  try {
    return fs.statSync(file).size;
  } catch {
    return 0;
  }
}

function readIfExists(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hashObject(value: unknown): string {
  return hashText(JSON.stringify(value));
}

function toPosix(input: string): string {
  return input.split(path.sep).join("/");
}

function hasPathSegment(filePath: string, segment: string): boolean {
  return filePath.split(path.sep).includes(segment);
}

export function fileUrlForLocalPath(localPath: string): string {
  return pathToFileURL(localPath).toString();
}

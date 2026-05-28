export const schemaVersion = "harness-gui/v1" as const;
export type SchemaVersion = typeof schemaVersion;

export type DataClass = "index-safe" | "local-path" | "sensitive-on-demand";
export type StaleState = "fresh" | "stale" | "missing" | "error";
export type QueueKey =
  | "review-needed"
  | "review-blocked"
  | "blocked"
  | "missing-materials"
  | "lesson-candidate"
  | "active"
  | "closed"
  | "archived";

export interface ProjectHealth {
  status: "passing" | "warning" | "failing" | "unknown";
  warnings: number;
  failures: number;
  summary: string;
}

export interface QueueCounts {
  reviewNeeded: number;
  reviewBlocked: number;
  blocked: number;
  missingMaterials: number;
  lessonCandidate: number;
  active: number;
  closed: number;
  archived: number;
}

export interface ProjectSummary {
  id: string;
  displayName: string;
  path: string;
  enabled?: boolean;
  dataClass: DataClass;
  health: ProjectHealth;
  queueCounts: QueueCounts;
  moduleSummary: Record<string, number>;
  lastScanAt: string;
  staleState: StaleState;
  staleReason?: string;
  taskCount: number;
  evidenceCount: number;
}

export interface TaskSummary {
  id: string;
  taskKey: string;
  title: string;
  projectId: string;
  projectPath: string;
  currentPath: string;
  moduleKey?: string;
  lifecycleState: string;
  reviewStatus: string;
  materialsReady: boolean;
  queues: QueueKey[];
  queueReasons: string[];
  repairPrompt: string;
  sourceFileHashes: Record<string, string>;
  sourceSnapshotHash: string;
  scannerVersion: string;
  generatedAt: string;
  staleState: StaleState;
  staleReason?: string;
  evidenceCount: number;
  dataClass: DataClass;
  archiveState?: "active" | "archived" | "soft-deleted" | "superseded";
  archiveBucket?: string;
  archivedBy?: string;
  archivedAt?: string;
  reviewConfirmedBy?: string;
  reviewConfirmedAt?: string;
  reviewConfirmationId?: string;
  releasePackage?: string;
}

export interface QueueItem {
  id: string;
  queue: QueueKey;
  projectId: string;
  taskKey: string;
  title: string;
  reason: string;
  exitCondition: string;
  priority: "critical" | "high" | "normal" | "low";
  sourceSnapshotHash: string;
  staleState: StaleState;
  generatedAt: string;
}

export interface EvidenceEntry {
  id: string;
  projectId: string;
  taskKey?: string;
  title: string;
  type: "contract" | "progress" | "review" | "artifact" | "finding" | "reference" | "ledger";
  sourcePath: string;
  dataClass: DataClass;
  sourceSnapshotHash?: string;
}

export interface ActionDescriptor {
  id: string;
  projectId: string;
  taskKey?: string;
  kind:
    | "open-path"
    | "copy-repair-prompt"
    | "review-confirm"
    | "refresh-scan"
    | "switch-project"
    | "focus-queue"
    | "toggle-left-sidebar"
    | "toggle-right-sidebar"
    | "reset-layout";
  label: string;
  enabled: boolean;
  previewOnly: boolean;
  status?: "ready" | "preview-only" | "disabled" | "stale" | "error";
  reason?: string;
  shortcut?: string;
  sourceSnapshotHash?: string;
  sourceFileHashes?: Record<string, string>;
}

export interface TaskMaterial {
  id: string;
  name: string;
  type: EvidenceEntry["type"];
  sourcePath: string;
  dataClass: DataClass;
  status: "present" | "missing";
  hash?: string;
  snippet?: string;
}

export interface PortfolioSnapshot {
  schemaVersion: SchemaVersion;
  generatedAt: string;
  scannerVersion: string;
  portfolio: {
    projectCount: number;
    taskCount: number;
    evidenceCount: number;
    queueCounts: QueueCounts;
  };
  projects: ProjectSummary[];
  queues: QueueItem[];
  tasks: TaskSummary[];
  evidence: EvidenceEntry[];
  actions: ActionDescriptor[];
}

export interface TaskDetail extends TaskSummary {
  contractFiles: EvidenceEntry[];
  materials: TaskMaterial[];
  artifactCount: number;
  findingCount: number;
  reviewGate: {
    canConfirm: boolean;
    previewOnly: boolean;
    reason: string;
    displayedHash: string;
  };
}

export interface BenchmarkMetrics {
  schemaVersion: "harness-gui-scan-benchmark/v1";
  generatedAt: string;
  projects: Array<{
    projectId: string;
    displayName: string;
    taskCount: number;
    markdownFileCount: number;
    docsBytes: number;
    fastIndexMs: number;
    errors: number;
  }>;
  summary: {
    projectCount: number;
    taskCount: number;
    markdownFileCount: number;
    docsBytes: number;
    fastIndexMs: number;
    incrementalMs: number;
    heavyCheckMs: number;
    errors: number;
    cacheHitRate: number;
  };
}

export const emptyQueueCounts = (): QueueCounts => ({
  reviewNeeded: 0,
  reviewBlocked: 0,
  blocked: 0,
  missingMaterials: 0,
  lessonCandidate: 0,
  active: 0,
  closed: 0,
  archived: 0
});

export function queueLabel(queue: QueueKey): string {
  return {
    "review-needed": "Review Needed",
    "review-blocked": "Review Blocked",
    blocked: "Blocked",
    "missing-materials": "Missing Materials",
    "lesson-candidate": "Lesson Candidate",
    active: "Active",
    closed: "Closed",
    archived: "Archived"
  }[queue];
}

export function queueToCountKey(queue: QueueKey): keyof QueueCounts {
  const map = {
    "review-needed": "reviewNeeded",
    "review-blocked": "reviewBlocked",
    blocked: "blocked",
    "missing-materials": "missingMaterials",
    "lesson-candidate": "lessonCandidate",
    active: "active",
    closed: "closed",
    archived: "archived"
  } satisfies Record<QueueKey, keyof QueueCounts>;
  return map[queue];
}

export function validatePortfolioSnapshot(value: unknown): string[] {
  const errors: string[] = [];
  const snapshot = value as Partial<PortfolioSnapshot>;
  if (!snapshot || typeof snapshot !== "object") return ["snapshot must be an object"];
  if (snapshot.schemaVersion !== schemaVersion) errors.push("schemaVersion must be harness-gui/v1");
  if (!snapshot.generatedAt) errors.push("generatedAt is required");
  if (!Array.isArray(snapshot.projects)) errors.push("projects must be an array");
  if (!Array.isArray(snapshot.tasks)) errors.push("tasks must be an array");
  if (!Array.isArray(snapshot.queues)) errors.push("queues must be an array");
  if (!Array.isArray(snapshot.evidence)) errors.push("evidence must be an array");
  for (const task of snapshot.tasks ?? []) {
    if (!task.projectId) errors.push(`task ${task.taskKey || task.id} missing projectId`);
    if (!task.sourceSnapshotHash) errors.push(`task ${task.taskKey || task.id} missing sourceSnapshotHash`);
    if (!task.scannerVersion) errors.push(`task ${task.taskKey || task.id} missing scannerVersion`);
    if (!task.staleState) errors.push(`task ${task.taskKey || task.id} missing staleState`);
  }
  for (const item of snapshot.queues ?? []) {
    if (!item.reason) errors.push(`queue item ${item.id} missing reason`);
    if (!item.exitCondition) errors.push(`queue item ${item.id} missing exitCondition`);
    if (!item.sourceSnapshotHash) errors.push(`queue item ${item.id} missing sourceSnapshotHash`);
  }
  return errors;
}

export function containsRawPrivatePayload(value: unknown): boolean {
  const text = JSON.stringify(value);
  return [
    "Task Contract:",
    "## 步骤",
    "## Progress",
    "PRIVATE:",
    ".harness-private",
    ".harness-private raw",
    "rawMarkdown"
  ].some((needle) => text.includes(needle));
}

export function assertIndexSafePayload(value: unknown): void {
  if (containsRawPrivatePayload(value)) {
    throw new Error("payload contains raw private content");
  }
}

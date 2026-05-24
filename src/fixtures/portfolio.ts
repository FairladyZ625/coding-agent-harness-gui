import {
  ActionDescriptor,
  EvidenceEntry,
  PortfolioSnapshot,
  ProjectSummary,
  QueueItem,
  TaskDetail,
  TaskSummary,
  emptyQueueCounts,
  queueToCountKey,
  schemaVersion
} from "../model/harnessGui";

const generatedAt = "2026-05-24T00:00:00.000Z";
const scannerVersion = "harness-gui-fixture/1";

export function createSyntheticPortfolio(projectCount = 15): PortfolioSnapshot {
  const projects: ProjectSummary[] = [];
  const tasks: TaskSummary[] = [];
  const evidence: EvidenceEntry[] = [];
  const actions: ActionDescriptor[] = [];

  for (let index = 1; index <= projectCount; index += 1) {
    const id = `fixture-project-${index}`;
    const projectTasks = [
      createTask(id, index, "review-needed"),
      createTask(id, index, "missing-materials"),
      createTask(id, index, index % 3 === 0 ? "blocked" : "active")
    ];
    tasks.push(...projectTasks);
    evidence.push(
      ...projectTasks.flatMap((task) => [
        createEvidence(task, "contract", "task_plan.md"),
        createEvidence(task, "progress", "progress.md"),
        createEvidence(task, "review", "review.md")
      ])
    );
    actions.push(
      ...projectTasks.flatMap((task) => [
        {
          id: `${task.taskKey}:open`,
          projectId: id,
          taskKey: task.taskKey,
          kind: "open-path" as const,
          label: "Open source folder",
          enabled: true,
          previewOnly: false,
          sourceSnapshotHash: task.sourceSnapshotHash
        },
        {
          id: `${task.taskKey}:confirm`,
          projectId: id,
          taskKey: task.taskKey,
          kind: "review-confirm" as const,
          label: "Confirm review",
          enabled: task.queues.includes("review-needed") && task.staleState === "fresh",
          previewOnly: true,
          reason: "V1 preview only until Harness CLI action is connected.",
          sourceSnapshotHash: task.sourceSnapshotHash,
          sourceFileHashes: task.sourceFileHashes
        }
      ])
    );
    projects.push(createProject(id, index, projectTasks));
  }

  const queues = tasks.flatMap(taskToQueueItems);
  return {
    schemaVersion,
    generatedAt,
    scannerVersion,
    portfolio: {
      projectCount: projects.length,
      taskCount: tasks.length,
      evidenceCount: evidence.length,
      queueCounts: aggregateQueueCounts(tasks)
    },
    projects,
    queues,
    tasks,
    evidence,
    actions
  };
}

export function freshReviewFixture(): TaskDetail {
  const task = createTask("fixture-project-1", 1, "review-needed");
  return {
    ...task,
    contractFiles: [createEvidence(task, "contract", "task_plan.md")],
    materials: [{
      id: `${task.taskKey}:task_plan.md`,
      name: "task_plan.md",
      type: "contract",
      sourcePath: `${task.currentPath}/task_plan.md`,
      dataClass: "index-safe",
      status: "present",
      hash: task.sourceFileHashes["task_plan.md"]
    }],
    artifactCount: 0,
    findingCount: 0,
    reviewGate: {
      canConfirm: true,
      previewOnly: true,
      reason: "Hash matches current scan; CLI confirm is not connected in V1.",
      displayedHash: task.sourceSnapshotHash
    }
  };
}

export function staleReviewFixture(): TaskDetail {
  const task = {
    ...createTask("fixture-project-2", 2, "review-needed"),
    staleState: "stale" as const,
    staleReason: "Source hash changed after this card was displayed."
  };
  return {
    ...task,
    contractFiles: [createEvidence(task, "contract", "task_plan.md")],
    materials: [{
      id: `${task.taskKey}:task_plan.md`,
      name: "task_plan.md",
      type: "contract",
      sourcePath: `${task.currentPath}/task_plan.md`,
      dataClass: "index-safe",
      status: "present",
      hash: task.sourceFileHashes["task_plan.md"]
    }],
    artifactCount: 0,
    findingCount: 0,
    reviewGate: {
      canConfirm: false,
      previewOnly: true,
      reason: "Displayed hash is stale; refresh the target project before confirming.",
      displayedHash: "old-hash"
    }
  };
}

function createProject(id: string, index: number, projectTasks: TaskSummary[]): ProjectSummary {
  const counts = aggregateQueueCounts(projectTasks);
  const hasMissing = counts.missingMaterials > 0;
  return {
    id,
    displayName: `Harness Fixture ${String(index).padStart(2, "0")}`,
    path: `/tmp/harness-fixtures/project-${String(index).padStart(2, "0")}`,
    dataClass: "local-path",
    health: {
      status: hasMissing ? "warning" : "passing",
      warnings: hasMissing ? 1 : 0,
      failures: 0,
      summary: hasMissing ? "Missing materials need attention" : "Fixture scan is healthy"
    },
    queueCounts: counts,
    moduleSummary: { gui: projectTasks.filter((task) => task.moduleKey === "gui").length },
    lastScanAt: generatedAt,
    staleState: "fresh",
    taskCount: projectTasks.length,
    evidenceCount: projectTasks.length * 3
  };
}

function createTask(projectId: string, projectIndex: number, queue: TaskSummary["queues"][number]): TaskSummary {
  const key = `${projectId}-task-${queue}`;
  const hash = `hash-${projectIndex}-${queue}`;
  return {
    id: key,
    taskKey: key,
    title: `${queue.replaceAll("-", " ")} packet for project ${projectIndex}`,
    projectId,
    projectPath: `/tmp/harness-fixtures/project-${String(projectIndex).padStart(2, "0")}`,
    currentPath: `docs/09-PLANNING/MODULES/gui/2026-05-24-${key}`,
    moduleKey: projectIndex % 2 === 0 ? "gui" : undefined,
    lifecycleState: queue === "closed" ? "done" : queue === "blocked" ? "blocked" : "active",
    reviewStatus: queue === "review-needed" ? "ready" : queue === "review-blocked" ? "blocked" : "not-submitted",
    materialsReady: queue !== "missing-materials",
    queues: [queue],
    queueReasons: [`Fixture enters ${queue} to exercise the portfolio queue.`],
    repairPrompt: `Review ${key} and update the missing contract fields.`,
    sourceFileHashes: {
      "task_plan.md": `${hash}-task-plan`,
      "progress.md": `${hash}-progress`,
      "review.md": `${hash}-review`
    },
    sourceSnapshotHash: hash,
    scannerVersion,
    generatedAt,
    staleState: queue === "review-blocked" ? "stale" : "fresh",
    staleReason: queue === "review-blocked" ? "Review materials changed after card generation" : undefined,
    evidenceCount: 3,
    dataClass: "index-safe"
  };
}

function createEvidence(task: TaskSummary, type: EvidenceEntry["type"], fileName: string): EvidenceEntry {
  return {
    id: `${task.taskKey}:${type}`,
    projectId: task.projectId,
    taskKey: task.taskKey,
    title: `${task.title} ${type}`,
    type,
    sourcePath: `${task.currentPath}/${fileName}`,
    dataClass: "index-safe",
    sourceSnapshotHash: task.sourceSnapshotHash
  };
}

export function taskToQueueItems(task: TaskSummary): QueueItem[] {
  return task.queues.map((queue) => ({
    id: `${task.projectId}:${task.taskKey}:${queue}`,
    queue,
    projectId: task.projectId,
    taskKey: task.taskKey,
    title: task.title,
    reason: task.queueReasons[0] ?? `Task is in ${queue}`,
    exitCondition: exitConditionForQueue(queue),
    priority: queue === "blocked" || queue === "review-blocked" ? "high" : "normal",
    sourceSnapshotHash: task.sourceSnapshotHash,
    staleState: task.staleState,
    generatedAt: task.generatedAt
  }));
}

export function aggregateQueueCounts(tasks: TaskSummary[]) {
  const counts = emptyQueueCounts();
  for (const task of tasks) {
    for (const queue of task.queues) {
      counts[queueToCountKey(queue)] += 1;
    }
  }
  return counts;
}

function exitConditionForQueue(queue: TaskSummary["queues"][number]): string {
  return {
    "review-needed": "Confirm through Harness gate after current hash is revalidated.",
    "review-blocked": "Close blocking finding or add the missing review material.",
    blocked: "Record unblock evidence in task progress.",
    "missing-materials": "Add required task contract/evidence files.",
    "lesson-candidate": "Promote, sediment, or reject the lesson candidate.",
    active: "Move to review, blocked, done, or superseded.",
    closed: "Read-only archive state."
  }[queue];
}

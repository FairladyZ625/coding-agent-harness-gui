import { ActionDescriptor, TaskDetail, TaskSummary } from "./harnessGui";

export interface ConsoleAction extends ActionDescriptor {
  id: string;
  group: "navigation" | "task" | "layout" | "registry";
  description: string;
}

export interface ShortcutInput {
  key: string;
  mod: boolean;
  shift?: boolean;
}

export function buildTaskActions(task?: TaskSummary | TaskDetail): ConsoleAction[] {
  if (!task) return [];
  const detail = task && "reviewGate" in task ? task : undefined;
  const stale = task.staleState !== "fresh";
  const canConfirm = Boolean(detail?.reviewGate.canConfirm) && !stale;
  return [
    {
      id: "open-path",
      projectId: task.projectId,
      taskKey: task.taskKey,
      kind: "open-path",
      label: "Open source",
      description: "Resolve this task path through the local API.",
      enabled: true,
      previewOnly: false,
      status: "ready",
      shortcut: "mod+o",
      group: "task",
      sourceSnapshotHash: task.sourceSnapshotHash
    },
    {
      id: "copy-prompt",
      projectId: task.projectId,
      taskKey: task.taskKey,
      kind: "copy-repair-prompt",
      label: "Copy repair prompt",
      description: "Copy an index-safe repair prompt for the selected task.",
      enabled: Boolean(task.repairPrompt),
      previewOnly: false,
      status: task.repairPrompt ? "ready" : "disabled",
      shortcut: "mod+shift+c",
      group: "task",
      sourceSnapshotHash: task.sourceSnapshotHash
    },
    {
      id: "review-confirm",
      projectId: task.projectId,
      taskKey: task.taskKey,
      kind: "review-confirm",
      label: "Confirm review preview",
      description: "Preflight the review-confirm gate without writing Harness state.",
      enabled: canConfirm,
      previewOnly: true,
      status: stale ? "stale" : canConfirm ? "preview-only" : "disabled",
      reason: stale ? "Source changed; refresh before confirming." : detail?.reviewGate.reason ?? "Task is not ready for review confirmation.",
      shortcut: "mod+enter",
      group: "task",
      sourceSnapshotHash: task.sourceSnapshotHash,
      sourceFileHashes: task.sourceFileHashes
    }
  ];
}

export function buildLayoutActions(input: {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}): ConsoleAction[] {
  return [
    {
      id: "toggle-left-sidebar",
      projectId: "workspace",
      kind: "toggle-left-sidebar",
      label: input.leftCollapsed ? "Expand project rail" : "Collapse project rail",
      description: "Toggle the project rail.",
      enabled: true,
      previewOnly: false,
      status: "ready",
      shortcut: "mod+[",
      group: "layout"
    },
    {
      id: "toggle-right-sidebar",
      projectId: "workspace",
      kind: "toggle-right-sidebar",
      label: input.rightCollapsed ? "Expand inspector" : "Collapse inspector",
      description: "Toggle the right inspector.",
      enabled: true,
      previewOnly: false,
      status: "ready",
      shortcut: "mod+]",
      group: "layout"
    },
    {
      id: "reset-layout",
      projectId: "workspace",
      kind: "reset-layout",
      label: "Reset layout",
      description: "Restore default panel sizes and sidebar visibility.",
      enabled: true,
      previewOnly: false,
      status: "ready",
      shortcut: "mod+0",
      group: "layout"
    }
  ];
}

export function filterActionsForPalette(actions: ConsoleAction[], query: string): ConsoleAction[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return actions;
  return actions.filter((action) => `${action.label} ${action.description} ${action.shortcut ?? ""}`.toLowerCase().includes(normalized));
}

export function matchesActionShortcut(shortcut: string | undefined, input: ShortcutInput): boolean {
  if (!shortcut) return false;
  const parts = shortcut.toLowerCase().split("+");
  const expectedKey = parts[parts.length - 1];
  const requiresMod = parts.includes("mod");
  const requiresShift = parts.includes("shift");
  const key = input.key.toLowerCase();
  return Boolean(input.mod) === requiresMod && Boolean(input.shift) === requiresShift && key === expectedKey;
}

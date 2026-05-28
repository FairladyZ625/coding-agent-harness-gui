import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addRegistryProject,
  confirmReviewPreview,
  fetchProjects,
  fetchSnapshot,
  fetchTaskDetail,
  openPathPreview,
  removeRegistryProject,
  setRegistryProjectEnabled
} from "../../../api/client";
import { createSyntheticPortfolio } from "../../../fixtures/portfolio";
import { buildLayoutActions, buildTaskActions, ConsoleAction, filterActionsForPalette, matchesActionShortcut } from "../../../model/actions";
import { PortfolioSnapshot, ProjectSummary, QueueItem, TaskDetail, TaskSummary } from "../../../model/harnessGui";
import { defaultUiPreferences, mergeUiPreferences, parseUiPreferences, UiPreferences } from "../../../model/uiPreferences";

export type ConsoleView = "projects" | "review" | "archive" | "evidence" | "settings";

const initialSnapshot = createSyntheticPortfolio(15);
const preferencesKey = "harness-gui-ui-preferences";

export function usePortfolioConsole() {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(initialSnapshot);
  const [view, setView] = useState<ConsoleView>("review");
  const [preferences, setPreferences] = useState<UiPreferences>(() => parseUiPreferences(localStorage.getItem(preferencesKey)));
  const [selectedProjectId, setSelectedProjectId] = useState(preferences.lastSelectedProjectId ?? initialSnapshot.projects[0]?.id ?? "");
  const [selectedTaskKey, setSelectedTaskKey] = useState(preferences.lastSelectedTaskKey ?? initialSnapshot.tasks[0]?.taskKey ?? "");
  const [registeredProjects, setRegisteredProjects] = useState<ProjectSummary[]>(initialSnapshot.projects);
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [detail, setDetail] = useState<TaskDetail | undefined>();
  const [statusLine, setStatusLine] = useState("Synthetic portfolio loaded while the local service starts.");
  const [isRefreshing, setRefreshing] = useState(false);

  const updatePreferences = useCallback((patch: Partial<UiPreferences>) => {
    setPreferences((current) => mergeUiPreferences(current, patch));
  }, []);

  useEffect(() => {
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }, [preferences]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchSnapshot();
      const projects = await fetchProjects().catch(() => next.projects);
      setDetail(undefined);
      setSnapshot(next);
      setRegisteredProjects(projects);
      setSelectedProjectId((current) => (next.projects.some((project) => project.id === current) ? current : next.projects[0]?.id || ""));
      setSelectedTaskKey((current) => (next.tasks.some((task) => task.taskKey === current) ? current : next.tasks[0]?.taskKey || ""));
      setStatusLine(`Scanned ${next.portfolio.projectCount} projects and ${next.portfolio.taskCount} tasks.`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedProject = snapshot.projects.find((project) => project.id === selectedProjectId) ?? snapshot.projects[0];
  const selectedTask =
    snapshot.tasks.find((task) => task.projectId === selectedProject?.id && task.taskKey === selectedTaskKey) ??
    snapshot.tasks.find((task) => task.projectId === selectedProject?.id) ??
    snapshot.tasks[0];
  const activeTask = detail ?? selectedTask;

  useEffect(() => {
    setPreferences((current) => mergeUiPreferences(current, {
      lastSelectedProjectId: selectedProject?.id,
      lastSelectedTaskKey: activeTask?.taskKey
    }));
  }, [activeTask?.taskKey, selectedProject?.id]);

  useEffect(() => {
    if (!selectedProjectId || !selectedTaskKey) return;
    fetchTaskDetail(selectedProjectId, selectedTaskKey).then(setDetail);
  }, [selectedProjectId, selectedTaskKey]);

  const filteredQueues = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return snapshot.queues.filter((item) => {
      if (view === "review" && !item.queue.includes("review") && item.queue !== "missing-materials" && item.queue !== "blocked") {
        return false;
      }
      if (view === "archive" && item.queue !== "archived") return false;
      if (!normalized) return true;
      return `${item.title} ${item.taskKey} ${item.reason}`.toLowerCase().includes(normalized);
    });
  }, [query, snapshot.queues, view]);

  const projectTasks = useMemo(() => snapshot.tasks.filter((task) => task.projectId === selectedProject?.id), [selectedProject?.id, snapshot.tasks]);

  const selectProject = useCallback((project: ProjectSummary) => {
    setDetail(undefined);
    setSelectedProjectId(project.id);
    setSelectedTaskKey(snapshot.tasks.find((task) => task.projectId === project.id)?.taskKey ?? "");
  }, [snapshot.tasks]);

  const selectQueueItem = useCallback((item: QueueItem) => {
    setDetail(undefined);
    setSelectedProjectId(item.projectId);
    setSelectedTaskKey(item.taskKey);
  }, []);

  const runConfirmPreview = useCallback(async () => {
    if (!activeTask) return;
    const result = await confirmReviewPreview(activeTask.projectId, activeTask.taskKey, activeTask.sourceSnapshotHash);
    setStatusLine(result.message);
  }, [activeTask]);

  const runOpenPath = useCallback(async () => {
    if (!activeTask) return;
    const result = await openPathPreview(activeTask.projectId, activeTask.currentPath.replace(/^task:/, ""));
    setStatusLine(result.ok ? `Open path resolved: ${result.path}` : `Open path unavailable: ${result.error ?? result.path}`);
  }, [activeTask]);

  const copyRepairPrompt = useCallback(async () => {
    if (!activeTask) return;
    await navigator.clipboard?.writeText(activeTask.repairPrompt);
    setStatusLine(`Copied repair prompt for ${activeTask.taskKey}.`);
  }, [activeTask]);

  const addProjectPath = useCallback(async (projectPath: string) => {
    try {
      setRegisteredProjects(await addRegistryProject(projectPath));
      setStatusLine(`Registered project path: ${projectPath}`);
      await refresh();
    } catch (error) {
      setStatusLine(`Project registration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [refresh]);

  const removeProject = useCallback(async (projectId: string) => {
    try {
      setRegisteredProjects(await removeRegistryProject(projectId));
      setStatusLine(`Removed project ${projectId} from the local registry.`);
      await refresh();
    } catch (error) {
      setStatusLine(`Project removal failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [refresh]);

  const setProjectEnabled = useCallback(async (projectId: string, enabled: boolean) => {
    try {
      setRegisteredProjects(await setRegistryProjectEnabled(projectId, enabled));
      setStatusLine(`${enabled ? "Enabled" : "Disabled"} project ${projectId}.`);
      await refresh();
    } catch (error) {
      setStatusLine(`Project update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [refresh]);

  const resetLayout = useCallback(() => {
    setPreferences((current) => ({
      ...defaultUiPreferences,
      theme: current.theme,
      language: current.language,
      lastSelectedProjectId: current.lastSelectedProjectId,
      lastSelectedTaskKey: current.lastSelectedTaskKey
    }));
    setStatusLine("Workspace layout reset.");
  }, []);

  const setQueuePanelWidth = useCallback((width: number) => updatePreferences({ queuePanelWidth: width }), [updatePreferences]);
  const setWorkspacePanelWidth = useCallback((width: number) => updatePreferences({ workspacePanelWidth: width }), [updatePreferences]);

  const actions = useMemo<ConsoleAction[]>(() => [
    {
      id: "refresh-scan",
      projectId: selectedProject?.id ?? "portfolio",
      kind: "refresh-scan",
      label: "Refresh portfolio",
      description: "Rescan all enabled Harness projects.",
      enabled: !isRefreshing,
      previewOnly: false,
      status: isRefreshing ? "disabled" : "ready",
      shortcut: "mod+r",
      group: "registry"
    },
    ...buildLayoutActions(preferences),
    ...buildTaskActions(activeTask)
  ], [activeTask, isRefreshing, preferences, selectedProject?.id]);

  const paletteActions = useMemo(() => filterActionsForPalette(actions, commandQuery), [actions, commandQuery]);

  const runAction = useCallback((action: ConsoleAction) => {
    if (!action.enabled && action.status !== "preview-only") {
      setStatusLine(action.reason ?? `${action.label} is unavailable.`);
      return;
    }
    if (action.id === "refresh-scan") void refresh();
    else if (action.id === "open-path") void runOpenPath();
    else if (action.id === "copy-prompt") void copyRepairPrompt();
    else if (action.id === "review-confirm") void runConfirmPreview();
    else if (action.id === "toggle-left-sidebar") updatePreferences({ leftCollapsed: !preferences.leftCollapsed });
    else if (action.id === "toggle-right-sidebar") updatePreferences({ rightCollapsed: !preferences.rightCollapsed });
    else if (action.id === "reset-layout") resetLayout();
    setCommandOpen(false);
  }, [copyRepairPrompt, preferences.leftCollapsed, preferences.rightCollapsed, refresh, resetLayout, runConfirmPreview, runOpenPath, updatePreferences]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) {
        if (event.key === "Escape") setCommandOpen(false);
        return;
      }
      const key = event.key.toLowerCase();
      const action = actions.find((candidate) => matchesActionShortcut(candidate.shortcut, { key: event.key, mod, shift: event.shiftKey }));
      if (key === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      } else if (action) {
        event.preventDefault();
        runAction(action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, runAction]);

  return {
    snapshot,
    registeredProjects,
    view,
    setView,
    query,
    setQuery,
    commandOpen,
    setCommandOpen,
    commandQuery,
    setCommandQuery,
    actions,
    paletteActions,
    runAction,
    preferences,
    updatePreferences,
    selectedProject,
    selectedTask,
    activeTask,
    detail,
    filteredQueues,
    projectTasks,
    statusLine,
    isRefreshing,
    refresh,
    selectProject,
    selectQueueItem,
    runConfirmPreview,
    runOpenPath,
    copyRepairPrompt,
    addProjectPath,
    removeProject,
    setProjectEnabled,
    setQueuePanelWidth,
    setWorkspacePanelWidth,
    resetLayout
  };
}

export type PortfolioConsoleModel = ReturnType<typeof usePortfolioConsole>;
export type ActiveTask = TaskSummary | TaskDetail;

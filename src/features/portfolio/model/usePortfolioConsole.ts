import { useCallback, useEffect, useMemo, useState } from "react";
import { confirmReviewPreview, fetchSnapshot, fetchTaskDetail, openPathPreview } from "../../../api/client";
import { createSyntheticPortfolio } from "../../../fixtures/portfolio";
import { PortfolioSnapshot, ProjectSummary, QueueItem, TaskDetail, TaskSummary } from "../../../model/harnessGui";

export type ConsoleView = "projects" | "review" | "evidence" | "settings";

const initialSnapshot = createSyntheticPortfolio(15);

export function usePortfolioConsole() {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(initialSnapshot);
  const [view, setView] = useState<ConsoleView>("review");
  const [selectedProjectId, setSelectedProjectId] = useState(initialSnapshot.projects[0]?.id ?? "");
  const [selectedTaskKey, setSelectedTaskKey] = useState(initialSnapshot.tasks[0]?.taskKey ?? "");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<TaskDetail | undefined>();
  const [statusLine, setStatusLine] = useState("Synthetic portfolio loaded while the local service starts.");
  const [isRefreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchSnapshot();
      setDetail(undefined);
      setSnapshot(next);
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
    if (!selectedProjectId || !selectedTaskKey) return;
    fetchTaskDetail(selectedProjectId, selectedTaskKey).then(setDetail);
  }, [selectedProjectId, selectedTaskKey]);

  const filteredQueues = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return snapshot.queues.filter((item) => {
      if (view === "review" && !item.queue.includes("review") && item.queue !== "missing-materials" && item.queue !== "blocked") {
        return false;
      }
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

  return {
    snapshot,
    view,
    setView,
    query,
    setQuery,
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
    copyRepairPrompt
  };
}

export type PortfolioConsoleModel = ReturnType<typeof usePortfolioConsole>;
export type ActiveTask = TaskSummary | TaskDetail;

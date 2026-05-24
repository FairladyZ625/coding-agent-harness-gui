import { CSSProperties, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "../../commands/ui/CommandPalette";
import { ProjectRail } from "../../navigation/ui/ProjectRail";
import { QueueColumn } from "../../queues/ui/QueueColumn";
import { TaskInspector } from "../../inspector/ui/TaskInspector";
import { TaskWorkspace } from "../../tasks/ui/TaskWorkspace";
import { usePortfolioConsole } from "../model/usePortfolioConsole";
import { cn } from "../../../shared/lib/cn";

export function PortfolioConsole() {
  const model = usePortfolioConsole();
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const panelWidths = useMemo(() => {
    if (viewportWidth < 1024) {
      return {
        rail: model.preferences.leftCollapsed ? 72 : 220,
        queue: model.preferences.queuePanelWidth,
        workspace: model.preferences.workspacePanelWidth,
        inspector: model.preferences.rightCollapsed ? 44 : 280
      };
    }
    const rail = model.preferences.leftCollapsed ? 72 : 220;
    const inspector = model.preferences.rightCollapsed ? 44 : 280;
    const gutters = 12;
    const minimumQueue = 280;
    const minimumWorkspace = 420;
    const available = Math.max(minimumQueue + minimumWorkspace, viewportWidth - rail - inspector - gutters);
    const targetQueue = model.preferences.queuePanelWidth;
    const targetWorkspace = model.preferences.workspacePanelWidth;
    const targetTotal = targetQueue + targetWorkspace;
    if (targetTotal <= available) return { rail, queue: targetQueue, workspace: targetWorkspace, inspector };
    const queueShare = targetQueue / targetTotal;
    const queue = Math.max(minimumQueue, Math.min(targetQueue, Math.round(available * queueShare)));
    const workspace = Math.max(minimumWorkspace, available - queue);
    return { rail, queue, workspace, inspector };
  }, [model.preferences.leftCollapsed, model.preferences.queuePanelWidth, model.preferences.rightCollapsed, model.preferences.workspacePanelWidth, viewportWidth]);
  const startResize = useCallback((panel: "queue" | "workspace", startEvent: ReactMouseEvent<HTMLButtonElement>) => {
    startEvent.preventDefault();
    const startX = startEvent.clientX;
    const initial = panel === "queue" ? model.preferences.queuePanelWidth : model.preferences.workspacePanelWidth;
    const onMove = (event: globalThis.MouseEvent) => {
      const delta = event.clientX - startX;
      if (panel === "queue") model.setQueuePanelWidth(initial + delta);
      else model.setWorkspacePanelWidth(initial + delta);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [model]);

  return (
    <div
      className={cn(
        "console-shell grid h-screen min-w-0 overflow-hidden bg-primary text-normal",
        model.preferences.leftCollapsed && "console-shell-left-collapsed",
        model.preferences.rightCollapsed && "console-shell-right-collapsed",
        model.preferences.density === "compact" ? "console-density-compact" : "console-density-comfortable"
      )}
      style={{
        "--rail-width": `${panelWidths.rail}px`,
        "--queue-width": `${model.preferences.queuePanelWidth}px`,
        "--workspace-width": `${model.preferences.workspacePanelWidth}px`,
        "--visible-queue-width": `${panelWidths.queue}px`,
        "--visible-workspace-width": `${panelWidths.workspace}px`,
        "--visible-inspector-width": `${panelWidths.inspector}px`
      } as CSSProperties}
    >
      <ProjectRail
        view={model.view}
        projects={model.snapshot.projects}
        selectedProjectId={model.selectedProject?.id}
        collapsed={model.preferences.leftCollapsed}
        onViewChange={model.setView}
        onProjectSelect={model.selectProject}
        onToggleCollapsed={() => model.updatePreferences({ leftCollapsed: !model.preferences.leftCollapsed })}
      />
      <QueueColumn
        view={model.view}
        snapshot={model.snapshot}
        registeredProjects={model.registeredProjects}
        preferences={model.preferences}
        query={model.query}
        selectedTaskKey={model.activeTask?.taskKey}
        isRefreshing={model.isRefreshing}
        onQueryChange={model.setQuery}
        onRefresh={() => void model.refresh()}
        onOpenCommandPalette={() => model.setCommandOpen(true)}
        onAddProject={model.addProjectPath}
        onRemoveProject={model.removeProject}
        onSetProjectEnabled={model.setProjectEnabled}
        onDensityChange={(density) => model.updatePreferences({ density })}
        onSelectQueueItem={model.selectQueueItem}
        onSelectProject={(projectId) => {
          const project = model.snapshot.projects.find((candidate) => candidate.id === projectId);
          if (project) model.selectProject(project);
        }}
      />
      <button className="console-resizer border-x border-border bg-secondary hover:bg-panel max-md:hidden" aria-label="Resize queue panel" onMouseDown={(event) => startResize("queue", event)} />
      <TaskWorkspace
        project={model.selectedProject}
        task={model.activeTask}
        projectTasks={model.projectTasks}
        actions={model.actions}
        onConfirmPreview={model.runConfirmPreview}
        onOpenPath={model.runOpenPath}
        onCopyPrompt={model.copyRepairPrompt}
      />
      <button className="console-resizer border-x border-border bg-secondary hover:bg-panel max-md:hidden" aria-label="Resize workspace panel" onMouseDown={(event) => startResize("workspace", event)} />
      <TaskInspector
        project={model.selectedProject}
        task={model.activeTask}
        statusLine={model.statusLine}
        collapsed={model.preferences.rightCollapsed}
        actions={model.actions}
        onToggleCollapsed={() => model.updatePreferences({ rightCollapsed: !model.preferences.rightCollapsed })}
        onConfirmPreview={model.runConfirmPreview}
        onOpenPath={model.runOpenPath}
        onCopyPrompt={model.copyRepairPrompt}
      />
      <CommandPalette
        open={model.commandOpen}
        query={model.commandQuery}
        actions={model.paletteActions}
        onQueryChange={model.setCommandQuery}
        onClose={() => model.setCommandOpen(false)}
        onRun={model.runAction}
      />
    </div>
  );
}

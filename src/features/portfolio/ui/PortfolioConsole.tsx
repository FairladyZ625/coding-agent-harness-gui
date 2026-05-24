import { CSSProperties, MouseEvent as ReactMouseEvent, useCallback } from "react";
import { CommandPalette } from "../../commands/ui/CommandPalette";
import { ProjectRail } from "../../navigation/ui/ProjectRail";
import { QueueColumn } from "../../queues/ui/QueueColumn";
import { TaskInspector } from "../../inspector/ui/TaskInspector";
import { TaskWorkspace } from "../../tasks/ui/TaskWorkspace";
import { usePortfolioConsole } from "../model/usePortfolioConsole";

export function PortfolioConsole() {
  const model = usePortfolioConsole();
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
      className={`app-shell ${model.preferences.leftCollapsed ? "left-collapsed" : ""} ${model.preferences.rightCollapsed ? "right-collapsed" : ""} density-${model.preferences.density}`}
      style={{
        "--queue-width": `${model.preferences.queuePanelWidth}px`,
        "--workspace-width": `${model.preferences.workspacePanelWidth}px`
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
      <button className="panel-resizer queue-resizer" aria-label="Resize queue panel" onMouseDown={(event) => startResize("queue", event)} />
      <TaskWorkspace
        project={model.selectedProject}
        task={model.activeTask}
        projectTasks={model.projectTasks}
        actions={model.actions}
        onConfirmPreview={model.runConfirmPreview}
        onOpenPath={model.runOpenPath}
        onCopyPrompt={model.copyRepairPrompt}
      />
      <button className="panel-resizer workspace-resizer" aria-label="Resize workspace panel" onMouseDown={(event) => startResize("workspace", event)} />
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

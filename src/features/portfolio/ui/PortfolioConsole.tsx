import { ProjectRail } from "../../navigation/ui/ProjectRail";
import { QueueColumn } from "../../queues/ui/QueueColumn";
import { TaskInspector } from "../../inspector/ui/TaskInspector";
import { TaskWorkspace } from "../../tasks/ui/TaskWorkspace";
import { usePortfolioConsole } from "../model/usePortfolioConsole";

export function PortfolioConsole() {
  const model = usePortfolioConsole();
  return (
    <div className="app-shell">
      <ProjectRail
        view={model.view}
        projects={model.snapshot.projects}
        selectedProjectId={model.selectedProject?.id}
        onViewChange={model.setView}
        onProjectSelect={model.selectProject}
      />
      <QueueColumn
        view={model.view}
        snapshot={model.snapshot}
        query={model.query}
        selectedTaskKey={model.activeTask?.taskKey}
        isRefreshing={model.isRefreshing}
        onQueryChange={model.setQuery}
        onRefresh={() => void model.refresh()}
        onSelectQueueItem={model.selectQueueItem}
        onSelectProject={(projectId) => {
          const project = model.snapshot.projects.find((candidate) => candidate.id === projectId);
          if (project) model.selectProject(project);
        }}
      />
      <TaskWorkspace
        project={model.selectedProject}
        task={model.activeTask}
        projectTasks={model.projectTasks}
        onConfirmPreview={model.runConfirmPreview}
        onOpenPath={model.runOpenPath}
        onCopyPrompt={model.copyRepairPrompt}
      />
      <TaskInspector
        project={model.selectedProject}
        task={model.activeTask}
        statusLine={model.statusLine}
        onConfirmPreview={model.runConfirmPreview}
        onOpenPath={model.runOpenPath}
        onCopyPrompt={model.copyRepairPrompt}
      />
    </div>
  );
}

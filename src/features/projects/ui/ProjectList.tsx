import { ProjectSummary } from "../../../model/harnessGui";
import { Badge } from "../../../shared/ui/Badge";

export function ProjectList({ projects, onSelect }: { projects: ProjectSummary[]; onSelect: (projectId: string) => void }) {
  return (
    <div className="mt-triple grid gap-base">
      {projects.map((project) => (
        <button key={project.id} className="w-full rounded-sm border border-border bg-primary p-double text-left transition-colors hover:border-brand hover:bg-panel" onClick={() => onSelect(project.id)}>
          <div className="flex items-start justify-between gap-base">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-high">{project.displayName}</h2>
              <p className="mt-half truncate text-sm text-low">{project.path}</p>
            </div>
            <Badge tone={project.health.status === "passing" ? "success" : project.health.status === "warning" ? "warning" : "danger"}>{project.health.status}</Badge>
          </div>
          <div className="mt-double flex flex-wrap gap-base text-xs text-low">
            <span>{project.taskCount} tasks</span>
            <span>{project.evidenceCount} evidence</span>
            <span>{project.staleState}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

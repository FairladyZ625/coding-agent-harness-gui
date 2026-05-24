import { ProjectSummary } from "../../../model/harnessGui";

export function ProjectList({ projects, onSelect }: { projects: ProjectSummary[]; onSelect: (projectId: string) => void }) {
  return (
    <div className="project-cards">
      {projects.map((project) => (
        <button key={project.id} className="project-card" onClick={() => onSelect(project.id)}>
          <div>
            <h2>{project.displayName}</h2>
            <p>{project.path}</p>
          </div>
          <span className={`health-pill ${project.health.status}`}>{project.health.status}</span>
          <div className="project-stats">
            <span>{project.taskCount} tasks</span>
            <span>{project.evidenceCount} evidence</span>
            <span>{project.staleState}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

import { FileSearch, Settings, ShieldCheck, SquareStack, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProjectSummary } from "../../../model/harnessGui";
import { ConsoleView } from "../../portfolio/model/usePortfolioConsole";

interface ProjectRailProps {
  view: ConsoleView;
  projects: ProjectSummary[];
  selectedProjectId?: string;
  onViewChange: (view: ConsoleView) => void;
  onProjectSelect: (project: ProjectSummary) => void;
}

export function ProjectRail({ view, projects, selectedProjectId, onViewChange, onProjectSelect }: ProjectRailProps) {
  const { t } = useTranslation("common");
  const nav = [
    { key: "projects" as const, label: t("nav.projects"), icon: <SquareStack size={18} /> },
    { key: "review" as const, label: t("nav.review"), icon: <ShieldCheck size={18} /> },
    { key: "evidence" as const, label: t("nav.evidence"), icon: <FileSearch size={18} /> },
    { key: "settings" as const, label: t("nav.settings"), icon: <Settings size={18} /> }
  ];

  return (
    <aside className="project-rail" aria-label={t("nav.projects")}>
      <div className="brand-mark">
        <Workflow size={20} />
        <span>{t("app.name")}</span>
      </div>
      <nav className="rail-nav" aria-label="Main navigation">
        {nav.map((item) => (
          <button key={item.key} className={`rail-button ${view === item.key ? "active" : ""}`} onClick={() => onViewChange(item.key)} title={item.label}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="project-list">
        {projects.map((project) => (
          <button key={project.id} className={`project-chip ${project.id === selectedProjectId ? "active" : ""}`} onClick={() => onProjectSelect(project)} title={project.path}>
            <span className={`health-dot ${project.health.status}`} />
            <span className="truncate">{project.displayName}</span>
            <strong>{project.queueCounts.reviewNeeded + project.queueCounts.reviewBlocked}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}

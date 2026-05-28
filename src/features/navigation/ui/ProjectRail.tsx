import { Archive, FileSearch, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, SquareStack, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProjectSummary } from "../../../model/harnessGui";
import { cn } from "../../../shared/lib/cn";
import { ConsoleView } from "../../portfolio/model/usePortfolioConsole";

interface ProjectRailProps {
  view: ConsoleView;
  projects: ProjectSummary[];
  selectedProjectId?: string;
  collapsed: boolean;
  onViewChange: (view: ConsoleView) => void;
  onProjectSelect: (project: ProjectSummary) => void;
  onToggleCollapsed: () => void;
}

export function ProjectRail({ view, projects, selectedProjectId, collapsed, onViewChange, onProjectSelect, onToggleCollapsed }: ProjectRailProps) {
  const { t } = useTranslation("common");
  const nav = [
    { key: "projects" as const, label: t("nav.projects"), icon: <SquareStack size={18} /> },
    { key: "review" as const, label: t("nav.review"), icon: <ShieldCheck size={18} /> },
    { key: "archive" as const, label: t("nav.archive"), icon: <Archive size={18} /> },
    { key: "evidence" as const, label: t("nav.evidence"), icon: <FileSearch size={18} /> },
    { key: "settings" as const, label: t("nav.settings"), icon: <Settings size={18} /> }
  ];

  return (
    <aside className="h-screen min-w-0 overflow-auto border-r border-border bg-panel px-base py-triple text-normal" aria-label={t("nav.projects")}>
      <div className={cn("flex min-h-11 items-center gap-base px-base font-semibold text-high", collapsed && "justify-center px-0")}>
        <Workflow size={20} />
        {!collapsed ? <span className="min-w-0 truncate">{t("app.name")}</span> : null}
        <button className="ml-auto inline-grid h-7 w-7 place-items-center rounded-sm border border-border bg-transparent text-low hover:border-brand hover:text-high" onClick={onToggleCollapsed} title={collapsed ? "Expand rail" : "Collapse rail"}>
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>
      <nav className="my-triple grid gap-half" aria-label="Main navigation">
        {nav.map((item) => (
          <button
            key={item.key}
            className={cn(
              "relative flex min-h-9 w-full items-center gap-base rounded-sm px-base text-left text-sm text-low transition-colors hover:bg-panel hover:text-normal",
              view === item.key && "bg-panel text-high before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-brand",
              collapsed && "justify-center px-0"
            )}
            onClick={() => onViewChange(item.key)}
            title={item.label}
          >
            {item.icon}
            {!collapsed ? <span>{item.label}</span> : null}
          </button>
        ))}
      </nav>
      <div className="grid gap-half">
        {projects.map((project) => (
          <button
            key={project.id}
            className={cn(
              "relative grid min-h-9 w-full grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-base rounded-sm px-base text-left text-sm text-low transition-colors hover:bg-panel hover:text-normal",
              project.id === selectedProjectId && "bg-panel text-high before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-brand",
              collapsed && "flex justify-center px-0"
            )}
            onClick={() => onProjectSelect(project)}
            title={project.path}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full bg-low",
                project.health.status === "passing" && "bg-success",
                project.health.status === "warning" && "bg-warning",
                project.health.status === "failing" && "bg-error"
              )}
            />
            {!collapsed ? <span className="truncate">{project.displayName}</span> : null}
            {!collapsed ? <strong className="text-xs text-normal">{project.queueCounts.reviewNeeded + project.queueCounts.reviewBlocked}</strong> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}

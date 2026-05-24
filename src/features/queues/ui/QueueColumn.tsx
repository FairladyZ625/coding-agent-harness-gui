import { AlertTriangle, Command, Gauge, Layers3, RefreshCcw, Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortfolioSnapshot, QueueItem, queueLabel } from "../../../model/harnessGui";
import { ProjectSummary } from "../../../model/harnessGui";
import { UiPreferences } from "../../../model/uiPreferences";
import { cn } from "../../../shared/lib/cn";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { QueueBadge } from "./QueueBadge";
import { ConsoleView } from "../../portfolio/model/usePortfolioConsole";
import { EvidenceList } from "../../evidence/ui/EvidenceList";
import { ProjectList } from "../../projects/ui/ProjectList";
import { SettingsPanel } from "../../settings/ui/SettingsPanel";

interface QueueColumnProps {
  view: ConsoleView;
  snapshot: PortfolioSnapshot;
  registeredProjects: ProjectSummary[];
  preferences: UiPreferences;
  query: string;
  selectedTaskKey?: string;
  isRefreshing: boolean;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
  onAddProject: (path: string) => void;
  onRemoveProject: (projectId: string) => void;
  onSetProjectEnabled: (projectId: string, enabled: boolean) => void;
  onDensityChange: (density: UiPreferences["density"]) => void;
  onSelectQueueItem: (item: QueueItem) => void;
  onSelectProject: (projectId: string) => void;
}

export function QueueColumn(props: QueueColumnProps) {
  const { t } = useTranslation("common");
  const title = {
    projects: t("nav.projects"),
    review: t("nav.review"),
    evidence: t("nav.evidence"),
    settings: t("nav.settings")
  }[props.view];

  return (
    <section className="h-screen min-w-0 overflow-auto border-r border-border bg-secondary p-triple">
      <header className="flex items-center justify-between gap-double">
        <div>
          <p className="mb-half text-xs uppercase tracking-wide text-low">{t("app.subtitle")}</p>
          <h1 className="m-0 text-xl font-semibold text-high">{title}</h1>
        </div>
        <div className="flex items-center gap-base">
          <Button variant="icon" onClick={props.onOpenCommandPalette} title={t("actions.command")} icon={<Command size={18} />} />
          <Button variant="icon" onClick={props.onRefresh} title={t("actions.refresh")} disabled={props.isRefreshing} icon={<RefreshCcw size={18} />} />
        </div>
      </header>

      <div className="mt-triple grid grid-cols-2 gap-base">
        <Metric icon={<Layers3 size={16} />} label={t("metrics.projects")} value={props.snapshot.portfolio.projectCount} />
        <Metric icon={<ShieldCheck size={16} />} label={t("metrics.review")} value={props.snapshot.portfolio.queueCounts.reviewNeeded} />
        <Metric icon={<AlertTriangle size={16} />} label={t("metrics.blocked")} value={props.snapshot.portfolio.queueCounts.blocked + props.snapshot.portfolio.queueCounts.reviewBlocked} />
        <Metric icon={<Gauge size={16} />} label={t("metrics.missing")} value={props.snapshot.portfolio.queueCounts.missingMaterials} />
      </div>

      <label className="mt-triple flex min-h-10 items-center gap-base rounded-sm border border-border bg-primary px-double text-low focus-within:border-brand">
        <Search size={16} />
        <input className="min-w-0 flex-1 border-0 bg-transparent text-normal outline-none placeholder:text-low" value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder={t("actions.search")} />
      </label>

      {props.view === "projects" ? (
        <ProjectList projects={props.snapshot.projects} onSelect={props.onSelectProject} />
      ) : props.view === "evidence" ? (
        <EvidenceList snapshot={props.snapshot} />
      ) : props.view === "settings" ? (
        <SettingsPanel
          projects={props.registeredProjects}
          preferences={props.preferences}
          onAddProject={props.onAddProject}
          onRemoveProject={props.onRemoveProject}
          onSetProjectEnabled={props.onSetProjectEnabled}
          onDensityChange={props.onDensityChange}
        />
      ) : (
        <QueueList items={props.snapshot.queues.filter((item) => {
          const normalized = props.query.trim().toLowerCase();
          const reviewSurface = item.queue.includes("review") || item.queue === "missing-materials" || item.queue === "blocked";
          return reviewSurface && (!normalized || `${item.title} ${item.taskKey} ${item.reason}`.toLowerCase().includes(normalized));
        })} selectedTaskKey={props.selectedTaskKey} onSelect={props.onSelectQueueItem} />
      )}
    </section>
  );
}

function Metric(props: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border bg-panel p-double text-sm text-low">
      {props.icon}
      <span className="ml-base">{props.label}</span>
      <strong className="mt-base block text-lg text-high">{props.value}</strong>
    </div>
  );
}

function QueueList({ items, selectedTaskKey, onSelect }: { items: QueueItem[]; selectedTaskKey?: string; onSelect: (item: QueueItem) => void }) {
  const grouped = items.reduce<Record<string, QueueItem[]>>((accumulator, item) => {
    accumulator[item.queue] ??= [];
    accumulator[item.queue].push(item);
    return accumulator;
  }, {});
  return (
    <div className="mt-triple grid min-w-0 gap-triple">
      {Object.entries(grouped).map(([queue, queueItems]) => (
        <section className="grid min-w-0 gap-base" key={queue}>
          <header className="flex items-center justify-between text-xs uppercase tracking-wide text-low">
            {queueLabel(queue as QueueItem["queue"])}
            <span>{queueItems.length}</span>
          </header>
          {queueItems.map((item) => (
            <button
              key={item.id}
              className={cn(
                "min-w-0 overflow-hidden rounded-sm border border-border bg-primary p-double text-left transition-colors hover:border-brand hover:bg-panel",
                item.taskKey === selectedTaskKey && "border-brand bg-panel"
              )}
              onClick={() => onSelect(item)}
            >
              <div className="flex min-w-0 items-center justify-between gap-base">
                <QueueBadge queue={item.queue} />
                <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
              </div>
              <h2 className="mt-base truncate text-base font-semibold text-high">{item.title}</h2>
              <p className="mt-base line-clamp-2 text-sm text-normal">{item.reason}</p>
              <small className="mt-base block text-xs text-low">{item.exitCondition}</small>
              <div className="mt-double flex min-w-0 flex-wrap gap-base text-xs text-low">
                <span className="max-w-full truncate">{item.projectId}</span>
                <span>{item.staleState}</span>
                <span>{item.sourceSnapshotHash.slice(0, 10)}</span>
              </div>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function priorityTone(priority: QueueItem["priority"]) {
  if (priority === "critical" || priority === "high") return "danger";
  if (priority === "normal") return "warning";
  return "neutral";
}

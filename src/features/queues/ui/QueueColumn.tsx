import { AlertTriangle, Command, Gauge, Layers3, RefreshCcw, Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortfolioSnapshot, QueueItem, queueLabel } from "../../../model/harnessGui";
import { ProjectSummary } from "../../../model/harnessGui";
import { UiPreferences } from "../../../model/uiPreferences";
import { Button } from "../../../shared/ui/Button";
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
    <section className="queue-column">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t("app.subtitle")}</p>
          <h1>{title}</h1>
        </div>
        <div className="topbar-actions">
          <Button variant="icon" onClick={props.onOpenCommandPalette} title={t("actions.command")} icon={<Command size={18} />} />
          <Button variant="icon" onClick={props.onRefresh} title={t("actions.refresh")} disabled={props.isRefreshing} icon={<RefreshCcw size={18} />} />
        </div>
      </header>

      <div className="metric-strip">
        <Metric icon={<Layers3 size={16} />} label={t("metrics.projects")} value={props.snapshot.portfolio.projectCount} />
        <Metric icon={<ShieldCheck size={16} />} label={t("metrics.review")} value={props.snapshot.portfolio.queueCounts.reviewNeeded} />
        <Metric icon={<AlertTriangle size={16} />} label={t("metrics.blocked")} value={props.snapshot.portfolio.queueCounts.blocked + props.snapshot.portfolio.queueCounts.reviewBlocked} />
        <Metric icon={<Gauge size={16} />} label={t("metrics.missing")} value={props.snapshot.portfolio.queueCounts.missingMaterials} />
      </div>

      <label className="search-box">
        <Search size={16} />
        <input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder={t("actions.search")} />
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
    <div className="metric">
      {props.icon}
      <span>{props.label}</span>
      <strong>{props.value}</strong>
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
    <div className="queue-list">
      {Object.entries(grouped).map(([queue, queueItems]) => (
        <section className="queue-group" key={queue}>
          <header>
            {queueLabel(queue as QueueItem["queue"])}
            <span>{queueItems.length}</span>
          </header>
          {queueItems.map((item) => (
            <button key={item.id} className={`queue-card ${item.taskKey === selectedTaskKey ? "active" : ""}`} onClick={() => onSelect(item)}>
              <div className="queue-card-top">
                <span className={`queue-badge ${item.queue}`}>{queueLabel(item.queue)}</span>
                <span className={`priority ${item.priority}`}>{item.priority}</span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.reason}</p>
              <small>{item.exitCondition}</small>
              <div className="queue-meta">
                <span>{item.projectId}</span>
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

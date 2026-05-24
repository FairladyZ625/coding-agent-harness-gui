import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  FileSearch,
  FolderOpen,
  Gauge,
  Layers3,
  PanelRightOpen,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareStack,
  Workflow
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { confirmReviewPreview, fetchSnapshot, fetchTaskDetail, openPathPreview } from "./api/client";
import {
  PortfolioSnapshot,
  ProjectSummary,
  QueueItem,
  TaskDetail,
  TaskSummary,
  queueLabel
} from "./model/harnessGui";
import { createSyntheticPortfolio } from "./fixtures/portfolio";

type ViewKey = "projects" | "review" | "evidence" | "settings";

const initialSnapshot = createSyntheticPortfolio(15);

export function App() {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(initialSnapshot);
  const [view, setView] = useState<ViewKey>("review");
  const [selectedProjectId, setSelectedProjectId] = useState(initialSnapshot.projects[0]?.id ?? "");
  const [selectedTaskKey, setSelectedTaskKey] = useState(initialSnapshot.tasks[0]?.taskKey ?? "");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<TaskDetail | undefined>();
  const [statusLine, setStatusLine] = useState("Synthetic portfolio loaded while the local service starts.");

  async function refresh() {
    const next = await fetchSnapshot();
    setDetail(undefined);
    setSnapshot(next);
    setSelectedProjectId((current) => next.projects.some((project) => project.id === current) ? current : next.projects[0]?.id || "");
    setSelectedTaskKey((current) => next.tasks.some((task) => task.taskKey === current) ? current : next.tasks[0]?.taskKey || "");
    setStatusLine(`Scanned ${next.portfolio.projectCount} projects and ${next.portfolio.taskCount} tasks.`);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedProjectId || !selectedTaskKey) return;
    fetchTaskDetail(selectedProjectId, selectedTaskKey).then(setDetail);
  }, [selectedProjectId, selectedTaskKey]);

  const selectedProject = snapshot.projects.find((project) => project.id === selectedProjectId) ?? snapshot.projects[0];
  const selectedTask =
    snapshot.tasks.find((task) => task.projectId === selectedProject?.id && task.taskKey === selectedTaskKey) ??
    snapshot.tasks.find((task) => task.projectId === selectedProject?.id) ??
    snapshot.tasks[0];
  const activeTask = detail ?? selectedTask;

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

  const projectTasks = snapshot.tasks.filter((task) => task.projectId === selectedProject?.id);

  async function runConfirmPreview() {
    if (!activeTask) return;
    const result = await confirmReviewPreview(activeTask.projectId, activeTask.taskKey, activeTask.sourceSnapshotHash);
    setStatusLine(result.message);
  }

  async function runOpenPath() {
    if (!activeTask) return;
    const result = await openPathPreview(activeTask.projectId, activeTask.currentPath.replace(/^task:/, ""));
    setStatusLine(result.ok ? `Open path resolved: ${result.path}` : `Open path unavailable: ${result.error ?? result.path}`);
  }

  async function copyRepairPrompt() {
    if (!activeTask) return;
    await navigator.clipboard?.writeText(activeTask.repairPrompt);
    setStatusLine(`Copied repair prompt for ${activeTask.taskKey}.`);
  }

  return (
    <div className="app-shell">
      <aside className="project-rail" aria-label="Projects">
        <div className="brand-mark">
          <Workflow size={20} />
          <span>Harness GUI</span>
        </div>
        <nav className="rail-nav" aria-label="Main navigation">
          <RailButton active={view === "projects"} icon={<SquareStack size={18} />} label="Projects" onClick={() => setView("projects")} />
          <RailButton active={view === "review"} icon={<ShieldCheck size={18} />} label="Review Queue" onClick={() => setView("review")} />
          <RailButton active={view === "evidence"} icon={<FileSearch size={18} />} label="Evidence" onClick={() => setView("evidence")} />
          <RailButton active={view === "settings"} icon={<Settings size={18} />} label="Settings" onClick={() => setView("settings")} />
        </nav>
        <div className="project-list">
          {snapshot.projects.map((project) => (
            <button
              key={project.id}
              className={`project-chip ${project.id === selectedProject?.id ? "active" : ""}`}
              onClick={() => {
                setDetail(undefined);
                setSelectedProjectId(project.id);
                setSelectedTaskKey(snapshot.tasks.find((task) => task.projectId === project.id)?.taskKey ?? "");
              }}
              title={project.path}
            >
              <span className={`health-dot ${project.health.status}`} />
              <span className="truncate">{project.displayName}</span>
              <strong>{project.queueCounts.reviewNeeded + project.queueCounts.reviewBlocked}</strong>
            </button>
          ))}
        </div>
      </aside>

      <section className="queue-column">
        <header className="topbar">
          <div>
            <p className="eyebrow">Portfolio Console</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <button className="icon-button" onClick={() => void refresh()} title="Refresh portfolio">
            <RefreshCcw size={18} />
          </button>
        </header>

        <div className="metric-strip">
          <Metric icon={<Layers3 size={16} />} label="Projects" value={snapshot.portfolio.projectCount} />
          <Metric icon={<ShieldCheck size={16} />} label="Review" value={snapshot.portfolio.queueCounts.reviewNeeded} />
          <Metric icon={<AlertTriangle size={16} />} label="Blocked" value={snapshot.portfolio.queueCounts.blocked + snapshot.portfolio.queueCounts.reviewBlocked} />
          <Metric icon={<Gauge size={16} />} label="Missing" value={snapshot.portfolio.queueCounts.missingMaterials} />
        </div>

        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter tasks, queues, evidence" />
        </label>

        {view === "projects" ? (
          <ProjectList projects={snapshot.projects} onSelect={setSelectedProjectId} selectedProjectId={selectedProject?.id} />
        ) : view === "evidence" ? (
          <EvidenceList snapshot={snapshot} />
        ) : view === "settings" ? (
          <SettingsPanel />
        ) : (
          <QueueList
            items={filteredQueues}
            selectedTaskKey={selectedTask?.taskKey}
            onSelect={(item) => {
              setDetail(undefined);
              setSelectedProjectId(item.projectId);
              setSelectedTaskKey(item.taskKey);
            }}
          />
        )}
      </section>

      <main className="workspace-panel">
        {selectedProject && activeTask ? (
          <TaskWorkspace
            project={selectedProject}
            task={activeTask}
            projectTasks={projectTasks}
            onConfirmPreview={runConfirmPreview}
            onOpenPath={runOpenPath}
            onCopyPrompt={copyRepairPrompt}
          />
        ) : (
          <div className="empty-state">
            <Sparkles size={24} />
            <h2>Select a task</h2>
            <p>Choose a project and queue item to inspect its contract, evidence, and review gate.</p>
          </div>
        )}
      </main>

      <aside className="inspector">
        <header className="inspector-header">
          <PanelRightOpen size={18} />
          <span>Inspector</span>
        </header>
        {activeTask ? (
          <>
            <InspectorRow label="Task key" value={activeTask.taskKey} />
            <InspectorRow label="Project" value={selectedProject?.displayName ?? activeTask.projectId} />
            <InspectorRow label="Path" value={activeTask.currentPath} />
            <InspectorRow label="Hash" value={activeTask.sourceSnapshotHash.slice(0, 12)} />
            <InspectorRow label="Stale" value={activeTask.staleState} />
            <div className="inspector-actions">
              <button className="secondary-button" onClick={() => void runOpenPath()}>
                <FolderOpen size={16} />
                Open path
              </button>
              <button className="secondary-button" onClick={() => void copyRepairPrompt()}>
                <ClipboardCopy size={16} />
                Copy prompt
              </button>
              <button className="primary-button" disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={() => void runConfirmPreview()}>
                <ShieldCheck size={16} />
                Confirm preview
              </button>
            </div>
          </>
        ) : null}
        <p className="status-line">{statusLine}</p>
      </aside>
    </div>
  );
}

function RailButton(props: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`rail-button ${props.active ? "active" : ""}`} onClick={props.onClick} title={props.label}>
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function Metric(props: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="metric">
      {props.icon}
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function QueueList(props: { items: QueueItem[]; selectedTaskKey?: string; onSelect: (item: QueueItem) => void }) {
  const grouped = props.items.reduce<Record<string, QueueItem[]>>((accumulator, item) => {
    accumulator[item.queue] ??= [];
    accumulator[item.queue].push(item);
    return accumulator;
  }, {});
  return (
    <div className="queue-list">
      {Object.entries(grouped).map(([queue, items]) => (
        <section className="queue-group" key={queue}>
          <header>{queueLabel(queue as QueueItem["queue"])} <span>{items.length}</span></header>
          {items.map((item) => (
            <button key={item.id} className={`queue-card ${item.taskKey === props.selectedTaskKey ? "active" : ""}`} onClick={() => props.onSelect(item)}>
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

function ProjectList(props: { projects: ProjectSummary[]; selectedProjectId?: string; onSelect: (projectId: string) => void }) {
  return (
    <div className="project-cards">
      {props.projects.map((project) => (
        <button key={project.id} className={`project-card ${project.id === props.selectedProjectId ? "active" : ""}`} onClick={() => props.onSelect(project.id)}>
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

function EvidenceList(props: { snapshot: PortfolioSnapshot }) {
  return (
    <div className="evidence-list">
      {props.snapshot.evidence.slice(0, 80).map((entry) => (
        <div className="evidence-row" key={entry.id}>
          <FileSearch size={16} />
          <div>
            <strong>{entry.title}</strong>
            <span>{entry.sourcePath}</span>
          </div>
          <em>{entry.type}</em>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="settings-panel">
      <h2>Local-only V1</h2>
      <p>Project registry is local. Global payloads stay index-safe. Raw private files load only on demand in a later gated path.</p>
      <ul>
        <li>Desktop packaging is deferred.</li>
        <li>Agent runner is deferred.</li>
        <li>Review confirm is preview-only until Harness CLI/core action exists.</li>
      </ul>
    </div>
  );
}

function TaskWorkspace(props: {
  project: ProjectSummary;
  task: TaskSummary | TaskDetail;
  projectTasks: TaskSummary[];
  onConfirmPreview: () => void;
  onOpenPath: () => void;
  onCopyPrompt: () => void;
}) {
  const detail = "reviewGate" in props.task ? props.task : undefined;
  const contractFiles = detail?.contractFiles ?? [];
  return (
    <div className="task-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{props.project.displayName}</p>
          <h2>{props.task.title}</h2>
        </div>
        <span className={`queue-badge ${props.task.queues[0]}`}>{queueLabel(props.task.queues[0])}</span>
      </header>
      <div className="workspace-actions">
        <button className="secondary-button" onClick={props.onOpenPath}>
          <FolderOpen size={16} />
          Open source
        </button>
        <button className="secondary-button" onClick={props.onCopyPrompt}>
          <ClipboardCopy size={16} />
          Copy prompt
        </button>
        <button className="primary-button" disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={props.onConfirmPreview}>
          <ShieldCheck size={16} />
          Confirm preview
        </button>
      </div>
      <section className="workspace-grid">
        <article className="focus-panel">
          <h3>Contract</h3>
          <p>{props.task.repairPrompt}</p>
          <dl>
            <div><dt>Lifecycle</dt><dd>{props.task.lifecycleState}</dd></div>
            <div><dt>Review</dt><dd>{props.task.reviewStatus}</dd></div>
            <div><dt>Materials</dt><dd>{props.task.materialsReady ? "ready" : "missing"}</dd></div>
            <div><dt>Module</dt><dd>{props.task.moduleKey ?? "project"}</dd></div>
          </dl>
        </article>
        <article className="focus-panel">
          <h3>Progress</h3>
          <p>{props.task.lifecycleState === "blocked" ? "Blocked task. Check findings before continuing." : "Active task packet indexed from Harness scanner output."}</p>
          <dl>
            <div><dt>Stale</dt><dd>{props.task.staleState}</dd></div>
            <div><dt>Hash</dt><dd>{props.task.sourceSnapshotHash.slice(0, 12)}</dd></div>
          </dl>
        </article>
        <article className="focus-panel">
          <h3>Evidence</h3>
          <div className="mini-list">
            {contractFiles.length ? contractFiles.map((entry) => (
              <span key={entry.id}>{entry.type}: {entry.title}</span>
            )) : <span>Evidence index is loading or unavailable.</span>}
          </div>
        </article>
        <article className="focus-panel">
          <h3>Review</h3>
          <p>{detail?.reviewGate.reason ?? "Loading current gate state from the local service."}</p>
          <button className="primary-button" disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={props.onConfirmPreview}>
            <ShieldCheck size={16} />
            Preview confirm
          </button>
        </article>
        <article className="focus-panel">
          <h3>Findings</h3>
          <p>{props.task.queues.includes("review-blocked") || props.task.queues.includes("blocked") ? "Blocking queue present. Inspect findings before confirm." : "No blocking finding is represented in the index-safe queue state."}</p>
        </article>
        <article className="focus-panel">
          <h3>Source</h3>
          <p>{props.task.currentPath}</p>
          <div className="mini-list">
            {Object.entries(props.task.sourceFileHashes).slice(0, 8).map(([file, hash]) => (
              <span key={file}>{file}: {hash.slice(0, 10)}</span>
            ))}
          </div>
        </article>
        <article className="wide-panel">
          <h3>Project Task Surface</h3>
          <div className="compact-table">
            {props.projectTasks.slice(0, 12).map((task) => (
              <div key={task.taskKey}>
                <span>{task.title}</span>
                <em>{task.queues.map(queueLabel).join(", ")}</em>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function InspectorRow(props: { label: string; value: string }) {
  return (
    <div className="inspector-row">
      <span>{props.label}</span>
      <strong title={props.value}>{props.value}</strong>
    </div>
  );
}

function viewTitle(view: ViewKey) {
  return {
    projects: "Projects",
    review: "Review Queue",
    evidence: "Evidence Search",
    settings: "Settings"
  }[view];
}

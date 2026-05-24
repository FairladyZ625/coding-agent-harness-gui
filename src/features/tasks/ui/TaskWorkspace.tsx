import { ClipboardCopy, FolderOpen, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProjectSummary, QueueKey, TaskDetail, TaskSummary, queueLabel } from "../../../model/harnessGui";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/Panel";

interface TaskWorkspaceProps {
  project?: ProjectSummary;
  task?: TaskSummary | TaskDetail;
  projectTasks: TaskSummary[];
  onConfirmPreview: () => void;
  onOpenPath: () => void;
  onCopyPrompt: () => void;
}

export function TaskWorkspace({ project, task, projectTasks, onConfirmPreview, onOpenPath, onCopyPrompt }: TaskWorkspaceProps) {
  const { t } = useTranslation("common");
  if (!project || !task) {
    return (
      <main className="workspace-panel">
        <div className="empty-state">
          <ShieldCheck size={24} />
          <h2>{t("empty.title")}</h2>
          <p>{t("empty.body")}</p>
        </div>
      </main>
    );
  }

  const detail = "reviewGate" in task ? task : undefined;
  const contractFiles = detail?.contractFiles ?? [];
  const primaryQueue = task.queues[0] as QueueKey;

  return (
    <main className="workspace-panel">
      <div className="workspace-hero">
        <div>
          <p className="eyebrow">{project.displayName}</p>
          <h2>{task.title}</h2>
        </div>
        <span className={`queue-badge ${primaryQueue}`}>{queueLabel(primaryQueue)}</span>
      </div>

      <div className="workspace-actions">
        <Button icon={<FolderOpen size={16} />} onClick={onOpenPath}>{t("actions.openPath")}</Button>
        <Button icon={<ClipboardCopy size={16} />} onClick={onCopyPrompt}>{t("actions.copyPrompt")}</Button>
        <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
          {t("actions.confirmPreview")}
        </Button>
      </div>

      <section className="workspace-grid">
        <Panel>
          <h3>{t("task.contract")}</h3>
          <p>{task.repairPrompt}</p>
          <dl>
            <div><dt>{t("task.lifecycle")}</dt><dd>{task.lifecycleState}</dd></div>
            <div><dt>{t("task.review")}</dt><dd>{task.reviewStatus}</dd></div>
            <div><dt>{t("task.materials")}</dt><dd>{task.materialsReady ? "ready" : "missing"}</dd></div>
            <div><dt>{t("task.module")}</dt><dd>{task.moduleKey ?? "project"}</dd></div>
          </dl>
        </Panel>
        <Panel>
          <h3>{t("task.progress")}</h3>
          <p>{task.lifecycleState === "blocked" ? t("task.blockedPacket") : t("task.activePacket")}</p>
          <dl>
            <div><dt>{t("task.stale")}</dt><dd>{task.staleState}</dd></div>
            <div><dt>{t("task.hash")}</dt><dd>{task.sourceSnapshotHash.slice(0, 12)}</dd></div>
          </dl>
        </Panel>
        <Panel>
          <h3>{t("task.evidence")}</h3>
          <div className="mini-list">
            {contractFiles.length ? contractFiles.map((entry) => (
              <span key={entry.id}>{entry.type}: {entry.title}</span>
            )) : <span>{t("task.loadingEvidence")}</span>}
          </div>
        </Panel>
        <Panel>
          <h3>{t("task.review")}</h3>
          <p>{detail?.reviewGate.reason ?? t("task.loadingGate")}</p>
          <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
            {t("actions.confirmPreview")}
          </Button>
        </Panel>
        <Panel>
          <h3>{t("task.findings")}</h3>
          <p>{task.queues.includes("review-blocked") || task.queues.includes("blocked") ? t("task.blockingFinding") : t("task.noBlockingFinding")}</p>
        </Panel>
        <Panel>
          <h3>{t("task.source")}</h3>
          <p>{task.currentPath}</p>
          <div className="mini-list">
            {Object.entries(task.sourceFileHashes).slice(0, 8).map(([file, hash]) => (
              <span key={file}>{file}: {hash.slice(0, 10)}</span>
            ))}
          </div>
        </Panel>
        <Panel className="wide-panel">
          <h3>{t("task.projectSurface")}</h3>
          <div className="compact-table">
            {projectTasks.slice(0, 12).map((candidate) => (
              <div key={candidate.taskKey}>
                <span>{candidate.title}</span>
                <em>{candidate.queues.map(queueLabel).join(", ")}</em>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

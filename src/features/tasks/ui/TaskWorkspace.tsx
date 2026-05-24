import { ClipboardCopy, FolderOpen, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConsoleAction } from "../../../model/actions";
import { ProjectSummary, QueueKey, TaskDetail, TaskSummary, queueLabel } from "../../../model/harnessGui";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/Panel";

interface TaskWorkspaceProps {
  project?: ProjectSummary;
  task?: TaskSummary | TaskDetail;
  projectTasks: TaskSummary[];
  actions: ConsoleAction[];
  onConfirmPreview: () => void;
  onOpenPath: () => void;
  onCopyPrompt: () => void;
}

export function TaskWorkspace({ project, task, projectTasks, actions, onConfirmPreview, onOpenPath, onCopyPrompt }: TaskWorkspaceProps) {
  const { t } = useTranslation("common");
  if (!project || !task) {
    return (
      <main className="h-screen min-w-0 overflow-auto bg-primary p-triple">
        <div className="grid h-full place-items-center rounded-sm border border-border bg-secondary text-center text-low">
          <ShieldCheck size={24} />
          <h2 className="mt-base text-lg font-semibold text-high">{t("empty.title")}</h2>
          <p className="mt-base max-w-md text-sm">{t("empty.body")}</p>
        </div>
      </main>
    );
  }

  const detail = "reviewGate" in task ? task : undefined;
  const contractFiles = detail?.contractFiles ?? [];
  const materials = detail?.materials ?? [];
  const primaryQueue = task.queues[0] as QueueKey;

  return (
    <main className="h-screen min-w-0 overflow-auto bg-primary p-triple">
      <div className="flex items-start justify-between gap-double">
        <div>
          <p className="mb-half text-xs uppercase tracking-wide text-low">{project.displayName}</p>
          <h2 className="m-0 text-2xl font-semibold text-high">{task.title}</h2>
        </div>
        <QueueBadge queue={primaryQueue} />
      </div>

      <div className="mt-triple flex flex-wrap gap-base">
        <Button icon={<FolderOpen size={16} />} onClick={onOpenPath}>{t("actions.openPath")}</Button>
        <Button icon={<ClipboardCopy size={16} />} onClick={onCopyPrompt}>{t("actions.copyPrompt")}</Button>
        <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
          {t("actions.confirmPreview")}
        </Button>
      </div>

      <div className="mt-double flex flex-wrap gap-base">
        {actions.slice(0, 6).map((action) => (
          <span key={action.id} className={cn("inline-flex items-center gap-base rounded-full bg-secondary px-double py-base text-xs text-low", action.status === "ready" && "text-normal", action.status === "preview-only" && "text-brand", action.status === "stale" && "text-warning", action.status === "disabled" && "opacity-60")} title={action.reason ?? action.description}>
            {action.label}
            <em className="font-mono not-italic">{action.shortcut?.replace("mod", "⌘") ?? action.status}</em>
          </span>
        ))}
      </div>

      <section className="mt-triple grid gap-double md:grid-cols-2">
        <Panel>
          <h3 className="text-base font-semibold text-high">{t("task.contract")}</h3>
          <p className="mt-base text-sm text-normal">{task.repairPrompt}</p>
          <dl className="mt-double grid gap-base text-sm">
            <div className="flex justify-between gap-base"><dt className="text-low">{t("task.lifecycle")}</dt><dd className="text-high">{task.lifecycleState}</dd></div>
            <div className="flex justify-between gap-base"><dt className="text-low">{t("task.review")}</dt><dd className="text-high">{task.reviewStatus}</dd></div>
            <div className="flex justify-between gap-base"><dt className="text-low">{t("task.materials")}</dt><dd className="text-high">{task.materialsReady ? "ready" : "missing"}</dd></div>
            <div className="flex justify-between gap-base"><dt className="text-low">{t("task.module")}</dt><dd className="text-high">{task.moduleKey ?? "project"}</dd></div>
          </dl>
        </Panel>
        <Panel>
          <h3 className="text-base font-semibold text-high">{t("task.progress")}</h3>
          <p className="mt-base text-sm text-normal">{task.lifecycleState === "blocked" ? t("task.blockedPacket") : t("task.activePacket")}</p>
          <dl className="mt-double grid gap-base text-sm">
            <div className="flex justify-between gap-base"><dt className="text-low">{t("task.stale")}</dt><dd className="text-high">{task.staleState}</dd></div>
            <div className="flex justify-between gap-base"><dt className="text-low">{t("task.hash")}</dt><dd className="font-mono text-high">{task.sourceSnapshotHash.slice(0, 12)}</dd></div>
          </dl>
        </Panel>
        <Panel>
          <h3 className="text-base font-semibold text-high">{t("task.evidence")}</h3>
          <div className="mt-base grid gap-base text-sm text-normal">
            {materials.length ? materials.map((material) => (
              <span className="truncate" key={material.id}>{material.status}: {material.name} · {material.hash?.slice(0, 10) ?? "missing"}</span>
            )) : contractFiles.length ? contractFiles.map((entry) => (
              <span className="truncate" key={entry.id}>{entry.type}: {entry.title}</span>
            )) : <span>{t("task.loadingEvidence")}</span>}
          </div>
        </Panel>
        <Panel>
          <h3 className="text-base font-semibold text-high">{t("task.review")}</h3>
          <p className="mt-base text-sm text-normal">{detail?.reviewGate.reason ?? t("task.loadingGate")}</p>
          <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
            {t("actions.confirmPreview")}
          </Button>
        </Panel>
        <Panel>
          <h3 className="text-base font-semibold text-high">{t("task.findings")}</h3>
          <p className="mt-base text-sm text-normal">{detail ? `${detail.findingCount} indexed finding rows.` : task.queues.includes("review-blocked") || task.queues.includes("blocked") ? t("task.blockingFinding") : t("task.noBlockingFinding")}</p>
        </Panel>
        <Panel>
          <h3 className="text-base font-semibold text-high">{t("task.source")}</h3>
          <p className="mt-base truncate font-mono text-sm text-low">{task.currentPath}</p>
          <div className="mt-base grid gap-base text-sm text-normal">
            {Object.entries(task.sourceFileHashes).slice(0, 8).map(([file, hash]) => (
              <span className="truncate" key={file}>{file}: {hash.slice(0, 10)}</span>
            ))}
          </div>
        </Panel>
        <Panel className="md:col-span-2">
          <h3 className="text-base font-semibold text-high">{t("task.projectSurface")}</h3>
          <div className="mt-base grid gap-half text-sm">
            {projectTasks.slice(0, 12).map((candidate) => (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-base border-b border-border py-base last:border-b-0" key={candidate.taskKey}>
                <span className="truncate text-normal">{candidate.title}</span>
                <em className="text-low">{candidate.queues.map(queueLabel).join(", ")}</em>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function QueueBadge({ queue }: { queue: QueueKey }) {
  const tone = queue.includes("blocked") || queue === "blocked" ? "bg-error/15 text-error" : queue === "missing-materials" ? "bg-warning/15 text-warning" : "bg-brand/15 text-brand";
  return <span className={cn("shrink-0 rounded-full px-double py-base text-xs font-medium", tone)}>{queueLabel(queue)}</span>;
}

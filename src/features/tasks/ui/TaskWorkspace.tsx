import { ClipboardCopy, FolderOpen, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConsoleAction } from "../../../model/actions";
import { ProjectSummary, QueueKey, TaskDetail, TaskSummary, queueLabel } from "../../../model/harnessGui";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/Panel";
import { QueueBadge } from "../../queues/ui/QueueBadge";

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
      <div className="flex min-w-0 items-start justify-between gap-double">
        <div className="min-w-0">
          <p className="mb-half text-xs uppercase tracking-wide text-low">{project.displayName}</p>
          <h2 className="m-0 break-words text-2xl font-semibold text-high">{task.title}</h2>
        </div>
        <QueueBadge queue={primaryQueue} className="shrink-0 px-double py-base" />
      </div>

      <div className="mt-triple flex flex-wrap gap-base md:sticky md:top-0 md:z-10 md:bg-primary/95 md:py-base">
        <Button icon={<FolderOpen size={16} />} onClick={onOpenPath}>{t("actions.openPath")}</Button>
        <Button icon={<ClipboardCopy size={16} />} onClick={onCopyPrompt}>{t("actions.copyPrompt")}</Button>
        <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
          {t("actions.confirmPreview")}
        </Button>
      </div>

      <div className="mt-double flex flex-wrap gap-base">
        {actions.slice(0, 6).map((action) => (
          <span key={action.id} className={cn("inline-flex max-w-full min-w-0 items-center gap-base rounded-full bg-secondary px-double py-base text-xs text-low", action.status === "ready" && "text-normal", action.status === "preview-only" && "text-brand", action.status === "stale" && "text-warning", action.status === "disabled" && "opacity-60")} title={action.reason ?? action.description}>
            <span className="min-w-0 truncate">{action.label}</span>
            <em className="shrink-0 font-mono not-italic">{action.shortcut?.replace("mod", "⌘") ?? action.status}</em>
          </span>
        ))}
      </div>

      <section className="mt-triple grid gap-double md:grid-cols-2">
        <Panel surface="primary">
          <h3 className="text-base font-semibold text-high">{t("task.contract")}</h3>
          <p className="mt-base break-words text-sm text-normal">{task.repairPrompt}</p>
          <dl className="mt-double grid gap-base text-sm">
            <MetaRow label={t("task.lifecycle")} value={task.lifecycleState} />
            <MetaRow label={t("task.review")} value={task.reviewStatus} />
            <MetaRow label={t("task.materials")} value={task.materialsReady ? "ready" : "missing"} />
            <MetaRow label={t("task.module")} value={task.moduleKey ?? "project"} />
          </dl>
        </Panel>
        <Panel surface="secondary">
          <h3 className="text-base font-semibold text-high">{t("task.progress")}</h3>
          <p className="mt-base break-words text-sm text-normal">{task.lifecycleState === "blocked" ? t("task.blockedPacket") : t("task.activePacket")}</p>
          <dl className="mt-double grid gap-base text-sm">
            <MetaRow label={t("task.stale")} value={task.staleState} />
            <MetaRow label={t("task.hash")} value={task.sourceSnapshotHash.slice(0, 12)} monospace />
          </dl>
        </Panel>
        {task.archiveState === "archived" ? (
          <Panel surface="secondary">
            <h3 className="text-base font-semibold text-high">{t("task.archive")}</h3>
            <dl className="mt-double grid gap-base text-sm">
              <MetaRow label={t("task.archiveBucket")} value={task.archiveBucket ?? "unclassified"} />
              <MetaRow label={t("task.archivedBy")} value={task.archivedBy ?? "unknown"} />
              <MetaRow label={t("task.archivedAt")} value={task.archivedAt ?? "unknown"} />
              <MetaRow label={t("task.reviewConfirmedBy")} value={task.reviewConfirmedBy ?? "unknown"} />
              <MetaRow label={t("task.reviewConfirmationId")} value={task.reviewConfirmationId ?? "unknown"} />
              <MetaRow label={t("task.releasePackage")} value={task.releasePackage ?? "none"} />
            </dl>
          </Panel>
        ) : null}
        <Panel surface="secondary">
          <h3 className="text-base font-semibold text-high">{t("task.evidence")}</h3>
          <div className="mt-base grid gap-base text-sm text-normal">
            {materials.length ? materials.map((material) => (
              <span className="truncate" key={material.id}>{material.status}: {material.name} · {material.hash?.slice(0, 10) ?? "missing"}</span>
            )) : contractFiles.length ? contractFiles.map((entry) => (
              <span className="truncate" key={entry.id}>{entry.type}: {entry.title}</span>
            )) : <span>{t("task.loadingEvidence")}</span>}
          </div>
        </Panel>
        <Panel surface="secondary">
          <h3 className="text-base font-semibold text-high">{t("task.review")}</h3>
          <p className="mt-base break-words text-sm text-normal">{detail?.reviewGate.reason ?? t("task.loadingGate")}</p>
          <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
            {t("actions.confirmPreview")}
          </Button>
        </Panel>
        <Panel surface="auxiliary">
          <h3 className="text-base font-semibold text-high">{t("task.findings")}</h3>
          <p className="mt-base break-words text-sm text-normal">{detail ? `${detail.findingCount} indexed finding rows.` : task.queues.includes("review-blocked") || task.queues.includes("blocked") ? t("task.blockingFinding") : t("task.noBlockingFinding")}</p>
        </Panel>
        <Panel surface="auxiliary">
          <h3 className="text-base font-semibold text-high">{t("task.source")}</h3>
          <p className="mt-base truncate font-mono text-sm text-low">{task.currentPath}</p>
          <div className="mt-base grid gap-base text-sm text-normal">
            {Object.entries(task.sourceFileHashes).slice(0, 8).map(([file, hash]) => (
              <span className="truncate" key={file}>{file}: {hash.slice(0, 10)}</span>
            ))}
          </div>
        </Panel>
        <Panel surface="auxiliary" className="md:col-span-2">
          <h3 className="text-base font-semibold text-high">{t("task.projectSurface")}</h3>
          <div className="mt-base grid gap-half text-sm">
            {projectTasks.slice(0, 12).map((candidate) => (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-base border-b border-border py-base last:border-b-0" key={candidate.taskKey}>
                <span className="truncate text-normal">{candidate.title}</span>
                <em className="max-w-40 truncate text-right text-low">{candidate.queues.map(queueLabel).join(", ")}</em>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function MetaRow({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-base">
      <dt className="text-low">{label}</dt>
      <dd className={cn("truncate text-right text-high", monospace && "font-mono")}>{value}</dd>
    </div>
  );
}

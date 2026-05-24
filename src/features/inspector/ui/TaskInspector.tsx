import { ClipboardCopy, FolderOpen, PanelRightClose, PanelRightOpen, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConsoleAction } from "../../../model/actions";
import { ProjectSummary, TaskDetail, TaskSummary } from "../../../model/harnessGui";
import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";

interface TaskInspectorProps {
  project?: ProjectSummary;
  task?: TaskSummary | TaskDetail;
  statusLine: string;
  collapsed: boolean;
  actions: ConsoleAction[];
  onToggleCollapsed: () => void;
  onConfirmPreview: () => void;
  onOpenPath: () => void;
  onCopyPrompt: () => void;
}

export function TaskInspector({ project, task, statusLine, collapsed, actions, onToggleCollapsed, onConfirmPreview, onOpenPath, onCopyPrompt }: TaskInspectorProps) {
  const { t } = useTranslation("common");
  const detail = task && "reviewGate" in task ? task : undefined;
  if (collapsed) {
    return (
      <aside className="h-screen min-w-0 overflow-auto border-l border-border bg-secondary p-base">
        <button className="vertical-writing inline-grid h-24 w-8 place-items-center rounded-sm border border-border bg-primary text-low hover:border-brand hover:text-high" onClick={onToggleCollapsed} title="Expand inspector">
          <PanelRightOpen size={16} />
        </button>
      </aside>
    );
  }
  return (
    <aside className="h-screen min-w-0 overflow-auto border-l border-border bg-secondary p-triple">
      <header className="flex items-center gap-base border-b border-border pb-double text-sm font-semibold text-high">
        <PanelRightOpen size={18} />
        <span>{t("inspector.title")}</span>
        <button className="ml-auto inline-grid h-7 w-7 place-items-center rounded-sm border border-border bg-transparent text-low hover:border-brand hover:text-high" onClick={onToggleCollapsed} title="Collapse inspector">
          <PanelRightClose size={15} />
        </button>
      </header>
      {task ? (
        <>
          <InspectorRow label={t("inspector.taskKey")} value={task.taskKey} />
          <InspectorRow label={t("inspector.project")} value={project?.displayName ?? task.projectId} />
          <InspectorRow label={t("inspector.path")} value={task.currentPath} />
          <InspectorRow label={t("inspector.hash")} value={task.sourceSnapshotHash.slice(0, 12)} />
          <InspectorRow label={t("inspector.stale")} value={task.staleState} />
          <div className="mt-triple grid gap-base">
            <Button icon={<FolderOpen size={16} />} onClick={onOpenPath}>{t("actions.openPath")}</Button>
            <Button icon={<ClipboardCopy size={16} />} onClick={onCopyPrompt}>{t("actions.copyPrompt")}</Button>
            <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
              {t("actions.confirmPreview")}
            </Button>
          </div>
          <div className="mt-triple grid gap-base">
            {actions.slice(0, 6).map((action) => (
              <div key={action.id} className={cn("flex items-center justify-between gap-base rounded-sm border border-border bg-primary px-double py-base text-sm", action.status === "preview-only" && "border-brand text-brand", action.status === "stale" && "text-warning")}>
                <span>{action.label}</span>
                <em className="text-xs text-low">{action.status}</em>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <p className="mt-triple rounded-sm bg-panel p-double text-sm text-low">{statusLine}</p>
    </aside>
  );
}

function InspectorRow(props: { label: string; value: string }) {
  return (
    <div className="grid gap-half border-b border-border py-base text-sm last:border-b-0">
      <span className="text-low">{props.label}</span>
      <strong className="truncate text-normal" title={props.value}>{props.value}</strong>
    </div>
  );
}

import { ClipboardCopy, FolderOpen, PanelRightOpen, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProjectSummary, TaskDetail, TaskSummary } from "../../../model/harnessGui";
import { Button } from "../../../shared/ui/Button";

interface TaskInspectorProps {
  project?: ProjectSummary;
  task?: TaskSummary | TaskDetail;
  statusLine: string;
  onConfirmPreview: () => void;
  onOpenPath: () => void;
  onCopyPrompt: () => void;
}

export function TaskInspector({ project, task, statusLine, onConfirmPreview, onOpenPath, onCopyPrompt }: TaskInspectorProps) {
  const { t } = useTranslation("common");
  const detail = task && "reviewGate" in task ? task : undefined;
  return (
    <aside className="inspector">
      <header className="inspector-header">
        <PanelRightOpen size={18} />
        <span>{t("inspector.title")}</span>
      </header>
      {task ? (
        <>
          <InspectorRow label={t("inspector.taskKey")} value={task.taskKey} />
          <InspectorRow label={t("inspector.project")} value={project?.displayName ?? task.projectId} />
          <InspectorRow label={t("inspector.path")} value={task.currentPath} />
          <InspectorRow label={t("inspector.hash")} value={task.sourceSnapshotHash.slice(0, 12)} />
          <InspectorRow label={t("inspector.stale")} value={task.staleState} />
          <div className="inspector-actions">
            <Button icon={<FolderOpen size={16} />} onClick={onOpenPath}>{t("actions.openPath")}</Button>
            <Button icon={<ClipboardCopy size={16} />} onClick={onCopyPrompt}>{t("actions.copyPrompt")}</Button>
            <Button variant="primary" icon={<ShieldCheck size={16} />} disabled={!(detail?.reviewGate.canConfirm ?? false)} onClick={onConfirmPreview}>
              {t("actions.confirmPreview")}
            </Button>
          </div>
        </>
      ) : null}
      <p className="status-line">{statusLine}</p>
    </aside>
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

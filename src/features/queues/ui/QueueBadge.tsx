import { QueueKey, queueLabel } from "../../../model/harnessGui";
import { Badge } from "../../../shared/ui/Badge";

export function QueueBadge({ queue, className }: { queue: QueueKey; className?: string }) {
  return (
    <Badge tone={queueTone(queue)} className={className}>
      {queueLabel(queue)}
    </Badge>
  );
}

function queueTone(queue: QueueKey) {
  if (queue.includes("blocked") || queue === "blocked") return "danger";
  if (queue === "missing-materials") return "warning";
  if (queue === "closed" || queue === "archived") return "neutral";
  if (queue === "active") return "success";
  if (queue === "lesson-candidate") return "merged";
  return "info";
}

import { FileSearch } from "lucide-react";
import { PortfolioSnapshot } from "../../../model/harnessGui";

export function EvidenceList({ snapshot }: { snapshot: PortfolioSnapshot }) {
  return (
    <div className="mt-triple grid gap-base">
      {snapshot.evidence.slice(0, 80).map((entry) => (
        <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-base rounded-sm border border-border bg-primary p-double text-sm" key={entry.id}>
          <FileSearch className="text-brand" size={16} />
          <div className="min-w-0">
            <strong className="block truncate text-high">{entry.title}</strong>
            <span className="block truncate text-low">{entry.sourcePath}</span>
          </div>
          <em className="text-xs text-low">{entry.type}</em>
        </div>
      ))}
    </div>
  );
}

import { FileSearch } from "lucide-react";
import { PortfolioSnapshot } from "../../../model/harnessGui";

export function EvidenceList({ snapshot }: { snapshot: PortfolioSnapshot }) {
  return (
    <div className="evidence-list">
      {snapshot.evidence.slice(0, 80).map((entry) => (
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

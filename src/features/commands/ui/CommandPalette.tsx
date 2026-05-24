import { Command, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { ConsoleAction } from "../../../model/actions";

interface CommandPaletteProps {
  open: boolean;
  query: string;
  actions: ConsoleAction[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onRun: (action: ConsoleAction) => void;
}

export function CommandPalette({ open, query, actions, onQueryChange, onClose, onRun }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);
  if (!open) return null;
  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <header className="command-search">
          <Command size={18} />
          <input ref={inputRef} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search commands, actions, layout" />
          <Search size={16} />
        </header>
        <div className="command-list">
          {actions.map((action) => (
            <button key={action.id} className={`command-item ${action.status ?? "ready"}`} onClick={() => onRun(action)}>
              <span>
                <strong>{action.label}</strong>
                <em>{action.reason ?? action.description}</em>
              </span>
              <kbd>{action.shortcut?.replace("mod", "⌘") ?? action.status}</kbd>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

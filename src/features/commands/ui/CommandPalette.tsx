import { Command, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ConsoleAction } from "../../../model/actions";
import { cn } from "../../../shared/lib/cn";

interface CommandPaletteProps {
  open: boolean;
  query: string;
  actions: ConsoleAction[];
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onRun: (action: ConsoleAction) => void;
}

export function CommandPalette({ open, query, actions, onQueryChange, onClose, onRun }: CommandPaletteProps) {
  const { t } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-center bg-primary/70 px-triple pt-24 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section className="w-[min(720px,calc(100vw-3rem))] rounded-sm border border-border bg-secondary shadow-2xl" role="dialog" aria-label={t("commandPalette.label")} onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex min-h-12 items-center gap-base border-b border-border px-double text-low">
          <Command size={18} />
          <input className="min-w-0 flex-1 border-0 bg-transparent text-normal outline-none placeholder:text-low" ref={inputRef} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t("commandPalette.placeholder")} />
          <Search size={16} />
        </header>
        <div className="grid max-h-[60vh] gap-half overflow-auto p-base">
          {actions.map((action) => (
            <button key={action.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-double rounded-sm px-double py-base text-left text-sm text-normal transition-colors hover:bg-panel", action.status === "stale" && "text-warning", action.status === "preview-only" && "text-brand", action.status === "disabled" && "opacity-60")} onClick={() => onRun(action)}>
              <span className="min-w-0">
                <strong className="block truncate text-high">{action.label}</strong>
                <em className="block truncate text-low">{action.reason ?? action.description}</em>
              </span>
              <kbd className="rounded-sm bg-panel px-base py-half font-mono text-xs text-low">{action.shortcut?.replace("mod", "⌘") ?? action.status}</kbd>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

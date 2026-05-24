import fs from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createSyntheticPortfolio } from "../src/fixtures/portfolio";
import { buildLayoutActions, buildTaskActions } from "../src/model/actions";
import { defaultUiPreferences } from "../src/model/uiPreferences";
import "../src/i18n";
import { CommandPalette } from "../src/features/commands/ui/CommandPalette";
import { TaskInspector } from "../src/features/inspector/ui/TaskInspector";
import { ProjectRail } from "../src/features/navigation/ui/ProjectRail";
import { QueueColumn } from "../src/features/queues/ui/QueueColumn";
import { TaskWorkspace } from "../src/features/tasks/ui/TaskWorkspace";
import { Badge } from "../src/shared/ui/Badge";
import { Button } from "../src/shared/ui/Button";
import { Panel } from "../src/shared/ui/Panel";

const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");
const stylesRoot = path.join(srcRoot, "app", "styles");

const authorizedCssFiles = new Set([
  path.join(stylesRoot, "index.css"),
  path.join(stylesRoot, "tokens.css"),
  path.join(stylesRoot, "components.css")
]);

const colorLiteralPattern = /(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|(?<!-)hsla?\()/;
const arbitraryRawColorPattern = /\b(?:bg|text|border|from|to|via)-\[(?:#|rgb|rgba|hsl|hsla)/;
const inlineColorStylePattern = /style=\{\{[^}]*\b(?:color|background|backgroundColor|borderColor)\b/;
const oldUiClassPattern = /(?:className|class)\s*=\s*(?:\{[\s\S]{0,240}?|["'`][\s\S]{0,240}?)(?:\bui-button\b|\bui-panel\b|\bui-badge\b)/;
const oldLayoutClassPattern = /(?:className|class)\s*=\s*(?:\{[\s\S]{0,240}?|["'`][\s\S]{0,240}?)(?:\bproject-rail\b|\bqueue-card\b|\bworkspace-panel\b)|(?:className|class)\s*=\s*["'`]inspector["'`]/;

function listFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(filePath, predicate);
    return predicate(filePath) ? [filePath] : [];
  });
}

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function relative(filePath: string) {
  return path.relative(repoRoot, filePath);
}

describe("GUI design-system compliance", () => {
  it("uses Tailwind 4 Vite integration without config or PostCSS fallback", () => {
    const packageJson = JSON.parse(read(path.join(repoRoot, "package.json"))) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const viteConfig = read(path.join(repoRoot, "vite.config.ts"));

    expect(allDependencies).toHaveProperty("tailwindcss");
    expect(allDependencies).toHaveProperty("@tailwindcss/vite");
    expect(viteConfig).toContain("@tailwindcss/vite");
    expect(viteConfig).not.toContain("@tailwindcss/postcss");

    expect(fs.existsSync(path.join(repoRoot, "tailwind.config.ts"))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "tailwind.config.js"))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "postcss.config.js"))).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, "postcss.config.cjs"))).toBe(false);
  });

  it("keeps CSS limited to the authorized Tailwind token surfaces", () => {
    const cssFiles = listFiles(srcRoot, (filePath) => filePath.endsWith(".css"));
    expect(cssFiles.map(relative).sort()).toEqual([...authorizedCssFiles].map(relative).sort());

    const indexCss = read(path.join(stylesRoot, "index.css"));
    expect(indexCss).toContain('@import "tailwindcss"');
    expect(indexCss).toContain('@import "./tokens.css"');
    expect(indexCss).toContain('@import "./components.css"');
    expect(indexCss).not.toMatch(/@tailwind\s+(base|components|utilities)/);
    expect(indexCss).not.toContain("@config");
  });

  it("contains Vibe-derived token mappings and no online font dependency", () => {
    const tokens = read(path.join(stylesRoot, "tokens.css"));

    for (const token of [
      "--text-high",
      "--text-normal",
      "--text-low",
      "--bg-primary",
      "--bg-secondary",
      "--bg-panel",
      "--brand",
      "--brand-hover",
      "--brand-secondary",
      "--success",
      "--warning",
      "--error",
      "--info",
      "--merged",
      "--text-on-brand"
    ]) {
      expect(tokens).toContain(token);
    }

    expect(tokens).toContain("--spacing-half");
    expect(tokens).toContain("--size-icon-xs");
    expect(tokens).toContain("@theme");
    expect(`${read(path.join(stylesRoot, "index.css"))}\n${tokens}`).not.toMatch(/fonts\.googleapis\.com|@import\s+url/i);
  });

  it("prevents raw colors, inline color styles, and old global UI contracts in source files", () => {
    const sourceFiles = listFiles(srcRoot, (filePath) => /\.(ts|tsx|css)$/.test(filePath));
    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const content = read(filePath);
      const isTokens = filePath.endsWith(path.join("styles", "tokens.css"));
      const isCss = filePath.endsWith(".css");
      if (!isTokens && colorLiteralPattern.test(content)) violations.push(`${relative(filePath)} contains raw color literal`);
      if (arbitraryRawColorPattern.test(content)) violations.push(`${relative(filePath)} contains arbitrary raw color utility`);
      if (/\.(?:ui-button|ui-panel|ui-badge)\b/.test(content) || oldUiClassPattern.test(content)) {
        violations.push(`${relative(filePath)} uses old ui-* visual contract`);
      }
      if ((isCss && /\.(?:project-rail|queue-card|workspace-panel|inspector)\b/.test(content)) || oldLayoutClassPattern.test(content)) {
        violations.push(`${relative(filePath)} uses old global layout visual contract`);
      }
      if (inlineColorStylePattern.test(content)) violations.push(`${relative(filePath)} contains inline color style`);
    }

    expect(violations).toEqual([]);
  });

  it("renders shared primitives with token-based utility classes", () => {
    const { container } = render(
      <>
        <Button variant="primary">Confirm</Button>
        <Badge tone="success">Ready</Badge>
        <Panel>Evidence</Panel>
      </>
    );

    expect(container.querySelector("button")?.className).toContain("bg-brand");
    expect(container.querySelector("span")?.className).toContain("text-success");
    expect(container.querySelector("section")?.className).toContain("bg-secondary");
    expect(container.innerHTML).not.toContain("ui-button");
    expect(container.innerHTML).not.toContain("ui-badge");
    expect(container.innerHTML).not.toContain("ui-panel");
  });

  it("renders portfolio feature surfaces without legacy class contracts", () => {
    const snapshot = createSyntheticPortfolio(2);
    const project = snapshot.projects[0];
    const task = snapshot.tasks[0];
    const actions = [...buildTaskActions(task), ...buildLayoutActions({ leftCollapsed: false, rightCollapsed: false })];
    const noop = () => undefined;

    const { container } = render(
      <>
        <ProjectRail
          view="review"
          projects={snapshot.projects}
          selectedProjectId={project.id}
          collapsed={false}
          onViewChange={noop}
          onProjectSelect={noop}
          onToggleCollapsed={noop}
        />
        <QueueColumn
          view="review"
          snapshot={snapshot}
          registeredProjects={snapshot.projects}
          preferences={defaultUiPreferences}
          query=""
          selectedTaskKey={task.taskKey}
          isRefreshing={false}
          onQueryChange={noop}
          onRefresh={noop}
          onOpenCommandPalette={noop}
          onAddProject={noop}
          onRemoveProject={noop}
          onSetProjectEnabled={noop}
          onDensityChange={noop}
          onSelectQueueItem={noop}
          onSelectProject={noop}
        />
        <TaskWorkspace project={project} task={task} projectTasks={snapshot.tasks} actions={actions} onConfirmPreview={noop} onOpenPath={noop} onCopyPrompt={noop} />
        <TaskInspector project={project} task={task} statusLine="ready" collapsed={false} actions={actions} onToggleCollapsed={noop} onConfirmPreview={noop} onOpenPath={noop} onCopyPrompt={noop} />
        <CommandPalette open query="" actions={actions} onQueryChange={noop} onClose={noop} onRun={noop} />
      </>
    );

    for (const oldClass of ["ui-button", "ui-badge", "ui-panel", "project-rail", "queue-card", "workspace-panel"]) {
      expect(container.innerHTML).not.toContain(oldClass);
    }
    expect(container.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe("Command palette");
    expect(container.innerHTML).toContain("bg-secondary");
    expect(container.innerHTML).toContain("bg-brand");
  });
});

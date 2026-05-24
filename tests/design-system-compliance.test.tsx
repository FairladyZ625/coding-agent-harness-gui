import fs from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { execFileSync } from "node:child_process";
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
import { QueueBadge } from "../src/features/queues/ui/QueueBadge";

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
const forbiddenConfigPattern = /^(?:tailwind|postcss)\.config\.(?:js|cjs|mjs|ts|cts|mts)$/;
const forbiddenTailwindDirectivePattern = /@tailwind\s+(?:base|components|utilities)|@config\b/;

const expectedTokenValues: Record<string, string> = {
  "--_background": "0 0% 95%",
  "--_foreground": "0 0% 5%",
  "--_radius": "0.125rem",
  "--text-high": "0 0% 5%",
  "--text-normal": "0 0% 20%",
  "--text-low": "0 0% 39%",
  "--_bg-primary-default": "0 0% 100%",
  "--_bg-secondary-default": "0 0% 95%",
  "--_bg-panel-default": "0 0% 89%",
  "--brand": "25 82% 54%",
  "--brand-hover": "25 75% 62%",
  "--brand-secondary": "25 82% 37%",
  "--error": "0 59% 57%",
  "--success": "117 38% 50%",
  "--warning": "32 95% 44%",
  "--info": "217 91% 60%",
  "--merged": "271 81% 46%",
  "--text-on-brand": "0 0% 100%",
  "--spacing-half": "0.25rem",
  "--spacing-base": "0.5rem",
  "--spacing-plusfifty": "0.75rem",
  "--spacing-double": "1rem",
  "--spacing-triple": "1.5rem",
  "--size-icon-xs": "0.9375rem",
  "--size-dot": "0.3rem"
};

const skippedDirs = new Set([".git", "node_modules", "dist", "artifacts"]);

function listFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirs.has(entry.name)) return [];
      return listFiles(filePath, predicate);
    }
    return predicate(filePath) ? [filePath] : [];
  });
}

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function relative(filePath: string) {
  return path.relative(repoRoot, filePath);
}

function listAllFiles(dir: string): string[] {
  return listFiles(dir, () => true);
}

function tokenValue(content: string, tokenName: string) {
  return content.match(new RegExp(`${tokenName.replaceAll("-", "\\-")}\\s*:\\s*([^;]+);`))?.[1].trim();
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
    expect(allDependencies).not.toHaveProperty("@tailwindcss/postcss");
    expect(allDependencies).not.toHaveProperty("autoprefixer");
    expect(allDependencies).not.toHaveProperty("postcss");

    const forbiddenConfigFiles = listAllFiles(repoRoot)
      .filter((filePath) => forbiddenConfigPattern.test(path.basename(filePath)))
      .map(relative);
    expect(forbiddenConfigFiles).toEqual([]);
  });

  it("keeps CSS limited to the authorized Tailwind token surfaces", () => {
    const cssFiles = listFiles(srcRoot, (filePath) => filePath.endsWith(".css"));
    expect(cssFiles.map(relative).sort()).toEqual([...authorizedCssFiles].map(relative).sort());

    const indexCss = read(path.join(stylesRoot, "index.css"));
    expect(indexCss).toContain('@import "tailwindcss"');
    expect(indexCss).toContain('@import "./tokens.css"');
    expect(indexCss).toContain('@import "./components.css"');
    for (const cssFile of cssFiles) {
      expect(read(cssFile), relative(cssFile)).not.toMatch(forbiddenTailwindDirectivePattern);
    }
  });

  it("contains Vibe-derived token values and no online font dependency", () => {
    const tokens = read(path.join(stylesRoot, "tokens.css"));

    for (const [token, value] of Object.entries(expectedTokenValues)) {
      expect(tokenValue(tokens, token), token).toBe(value);
    }

    for (const aliasToken of ["--bg-primary", "--bg-secondary", "--bg-panel"]) {
      expect(tokens).toContain(aliasToken);
    }
    expect(tokens).toContain("@theme");
    expect(`${read(path.join(stylesRoot, "index.css"))}\n${tokens}`).not.toMatch(/fonts\.googleapis\.com|@import\s+url/i);
  });

  it("keeps package manifest and dry-run output free of tests, artifacts, and private harness material", () => {
    const packageJson = JSON.parse(read(path.join(repoRoot, "package.json"))) as { files?: string[] };
    const files = packageJson.files ?? [];

    expect(files).toEqual(expect.arrayContaining(["dist/", "src/", "scripts/", "public/", "index.html", "vite.config.ts", "tsconfig.json", "README.md", "LICENSE", "package.json"]));
    for (const forbidden of ["tests", "tests/", "artifacts", "artifacts/", ".harness-private", ".harness-private/", "../docs", "../docs/"]) {
      expect(files).not.toContain(forbidden);
    }

    const packOutput = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: repoRoot, encoding: "utf8" });
    const [pack] = JSON.parse(packOutput) as Array<{ files: Array<{ path: string }> }>;
    const packedPaths = pack.files.map((entry) => entry.path);
    const forbiddenPackedPaths = packedPaths.filter((entry) => /(^|\/)(?:tests?|artifacts|\.harness-private|docs)(?:\/|$)/.test(entry));
    expect(forbiddenPackedPaths).toEqual([]);
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

  it("keeps adversarially long task text and actions inside the workspace contract", () => {
    const snapshot = createSyntheticPortfolio(1);
    const project = snapshot.projects[0];
    const task = {
      ...snapshot.tasks[0],
      title: "TaskWithAnUnbrokenIdentifierThatMustNotStretchTheMobileWorkspaceBeyondItsContainer0123456789",
      repairPrompt: "RepairPromptWithAnUnbrokenIdentifierThatShouldBreakInsideThePrimaryPanel0123456789".repeat(3),
      currentPath: "path:very-long-unbroken-path-segment-that-should-truncate-without-overflowing-the-source-panel",
      sourceFileHashes: {
        "very-long-unbroken-source-file-name-that-should-remain-inside-the-source-panel.md": "abcdef0123456789"
      }
    };
    const actions = [
      ...buildTaskActions(task),
      {
        id: "adversarial-action",
        projectId: project.id,
        taskKey: task.taskKey,
      kind: "copy-repair-prompt" as const,
      group: "task" as const,
      label: "ActionLabelWithAnUnbrokenIdentifierThatMustTruncateInsideTheChip0123456789",
      description: "Long adversarial action label fixture",
      enabled: true,
        previewOnly: false,
        status: "ready" as const,
        shortcut: "mod+shift+verylongshortcut"
      }
    ];

    const { container } = render(<TaskWorkspace project={project} task={task} projectTasks={[task]} actions={actions} onConfirmPreview={() => undefined} onOpenPath={() => undefined} onCopyPrompt={() => undefined} />);

    expect(container.querySelector("main h2")?.className).toContain("break-words");
    expect(container.querySelector('[data-panel-surface="primary"]')?.className).toContain("overflow-hidden");
    expect(container.innerHTML).toContain("min-w-0");
    expect(container.innerHTML).toContain("truncate");
  });

  it("maps queue badges to explicit status tones instead of defaulting queues to brand", () => {
    const { container } = render(
      <>
        <QueueBadge queue="review-needed" />
        <QueueBadge queue="lesson-candidate" />
        <QueueBadge queue="active" />
      </>
    );
    expect(container.innerHTML).toContain("text-info");
    expect(container.innerHTML).toContain("text-merged");
    expect(container.innerHTML).toContain("text-success");
    expect(container.innerHTML).not.toContain("text-brand");
  });
});

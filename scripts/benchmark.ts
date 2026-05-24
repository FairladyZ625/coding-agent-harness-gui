import fs from "node:fs";
import path from "node:path";
import { BenchmarkMetrics } from "../src/model/harnessGui";
import { createSyntheticPortfolio } from "../src/fixtures/portfolio";
import { loadRegistry } from "../src/server/registry";
import { scanProject } from "../src/server/scanner";

const started = performance.now();
const projects = loadRegistry();
const projectMetrics = [];

for (const project of projects) {
  const projectStarted = performance.now();
  const result = await scanProject(project);
  projectMetrics.push({
    projectId: result.project.id,
    displayName: result.project.displayName,
    taskCount: result.tasks.length,
    markdownFileCount: result.markdownFileCount,
    docsBytes: result.docsBytes,
    fastIndexMs: Math.round(performance.now() - projectStarted),
    errors: result.errors.length
  });
}

const synthetic = createSyntheticPortfolio(Math.max(15 - projectMetrics.length, 0));
for (const project of synthetic.projects) {
  const taskCount = synthetic.tasks.filter((task) => task.projectId === project.id).length;
  projectMetrics.push({
    projectId: project.id,
    displayName: project.displayName,
    taskCount,
    markdownFileCount: 0,
    docsBytes: 0,
    fastIndexMs: 0,
    errors: 0
  });
}

const output: BenchmarkMetrics = {
  schemaVersion: "harness-gui-scan-benchmark/v1",
  generatedAt: new Date().toISOString(),
  projects: projectMetrics,
  summary: {
    projectCount: projectMetrics.length,
    taskCount: projectMetrics.reduce((sum, project) => sum + project.taskCount, 0),
    markdownFileCount: projectMetrics.reduce((sum, project) => sum + project.markdownFileCount, 0),
    docsBytes: projectMetrics.reduce((sum, project) => sum + project.docsBytes, 0),
    fastIndexMs: Math.round(performance.now() - started),
    incrementalMs: 0,
    heavyCheckMs: 0,
    errors: projectMetrics.reduce((sum, project) => sum + project.errors, 0),
    cacheHitRate: 0
  }
};

const outDir = path.join("artifacts", "benchmarks");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `scan-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ outPath, summary: output.summary }, null, 2));

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RegisteredProject, defaultProjects } from "./scanner";
import { ProjectSummary, emptyQueueCounts } from "../model/harnessGui";

const registryDir = path.join(os.homedir(), ".coding-agent-harness-gui");
const registryPath = path.join(registryDir, "projects.json");

export function loadRegistry(): RegisteredProject[] {
  return loadRegistryFromFile(registryPath, defaultProjects());
}

export function loadRegistryFromFile(filePath: string, fallback: RegisteredProject[] = defaultProjects()): RegisteredProject[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as RegisteredProject[];
    return parsed.length ? normalizeProjects(parsed) : fallback;
  } catch {
    return fallback;
  }
}

export function saveRegistry(projects: RegisteredProject[]): void {
  saveRegistryToFile(registryPath, projects);
}

export function saveRegistryToFile(filePath: string, projects: RegisteredProject[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(normalizeProjects(projects), null, 2));
}

export function addProject(inputPath: string): RegisteredProject[] {
  const next = addProjectEntry(loadRegistry(), inputPath);
  saveRegistry(next);
  return loadRegistry();
}

export function addProjectEntry(projects: RegisteredProject[], inputPath: string): RegisteredProject[] {
  const resolved = path.resolve(inputPath);
  const id = slug(path.basename(resolved)) || `project-${projects.length + 1}`;
  if (projects.some((project) => path.resolve(project.path) === resolved)) return normalizeProjects(projects);
  return normalizeProjects([...projects, { id: uniqueId(id, projects), displayName: path.basename(resolved), path: resolved, enabled: true }]);
}

export function removeProject(id: string): RegisteredProject[] {
  const next = removeProjectEntry(loadRegistry(), id);
  saveRegistry(next);
  return loadRegistry();
}

export function removeProjectEntry(projects: RegisteredProject[], id: string): RegisteredProject[] {
  return normalizeProjects(projects.filter((project) => project.id !== id));
}

export function updateProjectEnabled(id: string, enabled: boolean): RegisteredProject[] {
  const next = setProjectEnabled(loadRegistry(), id, enabled);
  saveRegistry(next);
  return loadRegistry();
}

export function setProjectEnabled(projects: RegisteredProject[], id: string, enabled: boolean): RegisteredProject[] {
  return normalizeProjects(projects.map((project) => project.id === id ? { ...project, enabled } : project));
}

export function sanitizeRegistry(projects: RegisteredProject[]): ProjectSummary[] {
  return normalizeProjects(projects).map((project) => ({
    id: project.id,
    displayName: project.displayName,
    path: `project:${project.id}`,
    enabled: project.enabled !== false,
    dataClass: "index-safe",
    health: {
      status: project.enabled === false ? "unknown" : "passing",
      warnings: 0,
      failures: 0,
      summary: project.enabled === false ? "Project disabled in local registry" : "Project is enabled in local registry"
    },
    queueCounts: emptyQueueCounts(),
    moduleSummary: {},
    lastScanAt: project.lastScanAt ?? "",
    staleState: "fresh",
    taskCount: 0,
    evidenceCount: 0
  }));
}

function normalizeProjects(projects: RegisteredProject[]): RegisteredProject[] {
  return projects.map((project) => ({
    ...project,
    enabled: project.enabled !== false,
    dataClass: project.dataClass ?? "local-path"
  }));
}

function uniqueId(base: string, projects: RegisteredProject[]): string {
  let id = base;
  let counter = 2;
  while (projects.some((project) => project.id === id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

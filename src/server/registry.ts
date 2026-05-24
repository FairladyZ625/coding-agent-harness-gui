import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RegisteredProject, defaultProjects } from "./scanner";

const registryDir = path.join(os.homedir(), ".coding-agent-harness-gui");
const registryPath = path.join(registryDir, "projects.json");

export function loadRegistry(): RegisteredProject[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8")) as RegisteredProject[];
    return parsed.length ? parsed : defaultProjects();
  } catch {
    return defaultProjects();
  }
}

export function saveRegistry(projects: RegisteredProject[]): void {
  fs.mkdirSync(registryDir, { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify(projects, null, 2));
}

export function addProject(inputPath: string): RegisteredProject[] {
  const projects = loadRegistry();
  const resolved = path.resolve(inputPath);
  const id = slug(path.basename(resolved)) || `project-${projects.length + 1}`;
  if (!projects.some((project) => path.resolve(project.path) === resolved)) {
    projects.push({ id: uniqueId(id, projects), displayName: path.basename(resolved), path: resolved });
    saveRegistry(projects);
  }
  return loadRegistry();
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

import { PortfolioSnapshot, ProjectSummary, TaskDetail, TaskMaterial } from "../model/harnessGui";
import { createSyntheticPortfolio } from "../fixtures/portfolio";

export async function fetchSnapshot(): Promise<PortfolioSnapshot> {
  try {
    const response = await fetch("/api/snapshot");
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as PortfolioSnapshot;
  } catch {
    return createSyntheticPortfolio(15);
  }
}

export async function fetchTaskDetail(projectId: string, taskKey: string): Promise<TaskDetail | undefined> {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks/${encodeURIComponent(taskKey)}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as TaskDetail;
  } catch {
    return undefined;
  }
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as ProjectSummary[];
}

export async function addRegistryProject(path: string): Promise<ProjectSummary[]> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path })
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as ProjectSummary[];
}

export async function removeRegistryProject(projectId: string): Promise<ProjectSummary[]> {
  const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as ProjectSummary[];
}

export async function setRegistryProjectEnabled(projectId: string, enabled: boolean): Promise<ProjectSummary[]> {
  const response = await fetch(`/api/projects/${projectId}/enabled`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled })
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return (await response.json()) as ProjectSummary[];
}

export async function fetchTaskMaterial(projectId: string, taskKey: string, materialName: string): Promise<TaskMaterial | undefined> {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks/${encodeURIComponent(taskKey)}/materials/${encodeURIComponent(materialName)}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as TaskMaterial;
  } catch {
    return undefined;
  }
}

export async function confirmReviewPreview(projectId: string, taskKey: string, sourceSnapshotHash: string) {
  const response = await fetch(`/api/projects/${projectId}/reviews/${encodeURIComponent(taskKey)}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceSnapshotHash })
  });
  return response.json() as Promise<{ ok: boolean; status: number; message: string }>;
}

export async function openPathPreview(projectId: string, path: string) {
  const response = await fetch(`/api/projects/${projectId}/files/open`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path })
  });
  return response.json() as Promise<{ ok: boolean; path: string; url?: string; error?: string }>;
}

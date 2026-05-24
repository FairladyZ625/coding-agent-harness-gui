export const uiPreferencesSchemaVersion = "harness-gui-ui-preferences/v1" as const;

export interface UiPreferences {
  schemaVersion: typeof uiPreferencesSchemaVersion;
  theme: "dark" | "light";
  language: "en" | "zh-Hans";
  density: "comfortable" | "compact";
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  queuePanelWidth: number;
  workspacePanelWidth: number;
  lastSelectedProjectId?: string;
  lastSelectedTaskKey?: string;
}

export const defaultUiPreferences: UiPreferences = {
  schemaVersion: uiPreferencesSchemaVersion,
  theme: "dark",
  language: "en",
  density: "comfortable",
  leftCollapsed: false,
  rightCollapsed: false,
  queuePanelWidth: 360,
  workspacePanelWidth: 720
};

export function clampPanelSize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 320;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function mergeUiPreferences(current: UiPreferences, patch: Partial<UiPreferences>): UiPreferences {
  return {
    ...current,
    ...patch,
    schemaVersion: uiPreferencesSchemaVersion,
    queuePanelWidth: clampPanelSize(patch.queuePanelWidth ?? current.queuePanelWidth, 280, 520),
    workspacePanelWidth: clampPanelSize(patch.workspacePanelWidth ?? current.workspacePanelWidth, 520, 980)
  };
}

export function serializeUiPreferences(preferences: UiPreferences): string {
  const stable: UiPreferences = mergeUiPreferences(defaultUiPreferences, preferences);
  return JSON.stringify(stable);
}

export function parseUiPreferences(value: string | null | undefined): UiPreferences {
  if (!value) return defaultUiPreferences;
  try {
    const parsed = JSON.parse(value) as Partial<UiPreferences>;
    if (parsed.schemaVersion !== uiPreferencesSchemaVersion) return defaultUiPreferences;
    return mergeUiPreferences(defaultUiPreferences, parsed);
  } catch {
    return defaultUiPreferences;
  }
}

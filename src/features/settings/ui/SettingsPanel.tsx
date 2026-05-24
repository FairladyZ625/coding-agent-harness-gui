import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useTheme } from "../../../app/providers/ThemeProvider";
import { ProjectSummary } from "../../../model/harnessGui";
import { UiPreferences } from "../../../model/uiPreferences";
import { Button } from "../../../shared/ui/Button";

interface SettingsPanelProps {
  projects?: ProjectSummary[];
  preferences?: UiPreferences;
  onAddProject?: (path: string) => void;
  onRemoveProject?: (projectId: string) => void;
  onSetProjectEnabled?: (projectId: string, enabled: boolean) => void;
  onDensityChange?: (density: UiPreferences["density"]) => void;
}

export function SettingsPanel({ projects = [], preferences, onAddProject, onRemoveProject, onSetProjectEnabled, onDensityChange }: SettingsPanelProps) {
  const { t, i18n } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  const [projectPath, setProjectPath] = useState("");
  return (
    <div className="mt-triple grid gap-triple text-sm">
      <div>
        <h2 className="text-base font-semibold text-high">{t("settings.title")}</h2>
        <p className="mt-half text-low">{t("settings.body")}</p>
      </div>
      <div className="grid gap-triple">
        <div>
          <strong className="text-high">{t("settings.language")}</strong>
          <div className="mt-base flex flex-wrap gap-base">
            <Button variant={i18n.language.startsWith("zh") ? "primary" : "secondary"} onClick={() => void i18n.changeLanguage("zh-Hans")}>中文</Button>
            <Button variant={i18n.language.startsWith("en") ? "primary" : "secondary"} onClick={() => void i18n.changeLanguage("en")}>{t("settings.english")}</Button>
          </div>
        </div>
        <div>
          <strong className="text-high">{t("settings.theme")}</strong>
          <div className="mt-base flex flex-wrap gap-base">
            <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>{t("settings.dark")}</Button>
            <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>{t("settings.light")}</Button>
          </div>
        </div>
        <div>
          <strong className="text-high">{t("settings.density")}</strong>
          <div className="mt-base flex flex-wrap gap-base">
            <Button variant={preferences?.density === "compact" ? "primary" : "secondary"} onClick={() => onDensityChange?.("compact")}>{t("settings.compact")}</Button>
            <Button variant={preferences?.density !== "compact" ? "primary" : "secondary"} onClick={() => onDensityChange?.("comfortable")}>{t("settings.comfortable")}</Button>
          </div>
        </div>
        <div>
          <strong className="text-high">{t("settings.registry")}</strong>
          <div className="mt-base flex gap-base">
            <input className="min-w-0 flex-1 rounded-sm border border-border bg-primary px-double py-base text-normal outline-none placeholder:text-low focus:border-brand" value={projectPath} onChange={(event) => setProjectPath(event.target.value)} placeholder={t("settings.registryPlaceholder")} />
            <Button onClick={() => {
              if (!projectPath.trim()) return;
              onAddProject?.(projectPath.trim());
              setProjectPath("");
            }}>{t("settings.addProject")}</Button>
          </div>
          <div className="mt-base grid gap-base">
            {projects.map((project) => (
              <div key={project.id} className="grid gap-base rounded-sm border border-border bg-primary p-base">
                <span className="min-w-0">
                  <strong className="block truncate text-high">{project.displayName}</strong>
                  <em className="block truncate text-low">{project.path}</em>
                </span>
                <div className="flex gap-base">
                  <Button variant="ghost" onClick={() => onSetProjectEnabled?.(project.id, project.enabled === false)}>
                    {project.enabled === false ? t("settings.enable") : t("settings.disable")}
                  </Button>
                  <Button variant="ghost" onClick={() => onRemoveProject?.(project.id)}>{t("settings.remove")}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ul className="grid gap-half text-low">
        <li>{t("settings.packaging")}</li>
        <li>{t("settings.runner")}</li>
        <li>{t("settings.confirm")}</li>
      </ul>
    </div>
  );
}

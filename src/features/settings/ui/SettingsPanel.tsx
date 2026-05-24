import { useTranslation } from "react-i18next";
import { useTheme } from "../../../app/providers/ThemeProvider";
import { Button } from "../../../shared/ui/Button";

export function SettingsPanel() {
  const { t, i18n } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  return (
    <div className="settings-panel">
      <h2>{t("settings.title")}</h2>
      <p>{t("settings.body")}</p>
      <div className="settings-grid">
        <div>
          <strong>Language</strong>
          <div className="segmented">
            <Button variant={i18n.language.startsWith("zh") ? "primary" : "secondary"} onClick={() => void i18n.changeLanguage("zh-Hans")}>中文</Button>
            <Button variant={i18n.language.startsWith("en") ? "primary" : "secondary"} onClick={() => void i18n.changeLanguage("en")}>English</Button>
          </div>
        </div>
        <div>
          <strong>Theme</strong>
          <div className="segmented">
            <Button variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>Dark</Button>
            <Button variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>Light</Button>
          </div>
        </div>
      </div>
      <ul>
        <li>{t("settings.packaging")}</li>
        <li>{t("settings.runner")}</li>
        <li>{t("settings.confirm")}</li>
      </ul>
    </div>
  );
}

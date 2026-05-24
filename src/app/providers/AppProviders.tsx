import { ReactNode, useEffect } from "react";
import i18n from "../../i18n";
import { ThemeProvider } from "./ThemeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <HtmlLanguageSync />
      {children}
    </ThemeProvider>
  );
}

function HtmlLanguageSync() {
  useEffect(() => {
    const sync = (language: string) => {
      document.documentElement.lang = language.startsWith("zh") ? "zh-Hans" : "en";
    };
    sync(i18n.language);
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, []);
  return null;
}

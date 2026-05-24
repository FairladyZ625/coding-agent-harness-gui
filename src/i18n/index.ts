import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import zhHansCommon from "./locales/zh-Hans/common.json";
import { normalizeLanguage, supportedLanguages } from "./languages";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      "zh-Hans": { common: zhHansCommon }
    },
    fallbackLng: {
      zh: ["zh-Hans"],
      "zh-CN": ["zh-Hans"],
      "zh-SG": ["zh-Hans"],
      default: ["en"]
    },
    supportedLngs: [...supportedLanguages, "zh", "zh-CN", "zh-SG"],
    nonExplicitSupportedLngs: true,
    defaultNS: "common",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "harness-gui-language",
      caches: ["localStorage"],
      convertDetectedLanguage: normalizeLanguage
    }
  });

export default i18n;

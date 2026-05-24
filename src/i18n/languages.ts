export const supportedLanguages = ["en", "zh-Hans"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export function normalizeLanguage(language: string): SupportedLanguage {
  if (language.toLowerCase().startsWith("zh")) return "zh-Hans";
  return "en";
}

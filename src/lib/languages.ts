export interface Language {
  code: string;
  /** Name in the language itself, shown in the picker. */
  native: string;
  /** English name, used in prompts. */
  english: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: readonly Language[] = [
  { code: "en", native: "English", english: "English", dir: "ltr" },
  { code: "es", native: "Español", english: "Spanish", dir: "ltr" },
  { code: "zh-CN", native: "简体中文", english: "Simplified Chinese", dir: "ltr" },
  { code: "hi", native: "हिन्दी", english: "Hindi", dir: "ltr" },
  { code: "ar", native: "العربية", english: "Arabic", dir: "rtl" },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese", dir: "ltr" },
  { code: "tl", native: "Tagalog", english: "Tagalog", dir: "ltr" },
  { code: "fr", native: "Français", english: "French", dir: "ltr" },
  { code: "pt-BR", native: "Português", english: "Brazilian Portuguese", dir: "ltr" },
  { code: "ru", native: "Русский", english: "Russian", dir: "ltr" },
  { code: "ko", native: "한국어", english: "Korean", dir: "ltr" },
  { code: "bn", native: "বাংলা", english: "Bengali", dir: "ltr" },
  { code: "ur", native: "اردو", english: "Urdu", dir: "rtl" },
  { code: "ht", native: "Kreyòl ayisyen", english: "Haitian Creole", dir: "ltr" },
  { code: "pl", native: "Polski", english: "Polish", dir: "ltr" },
  { code: "uk", native: "Українська", english: "Ukrainian", dir: "ltr" },
];

export const DEFAULT_LANGUAGE = "en";

export function findLanguage(code: string): Language | undefined {
  return LANGUAGES.find((language) => language.code === code);
}

export function languageOrDefault(code: string | null | undefined): Language {
  return (code && findLanguage(code)) || LANGUAGES[0];
}

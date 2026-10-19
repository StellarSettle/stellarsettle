import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// Add a locale by dropping `src/locales/<code>.json` next to en.json and
// registering it below. Missing keys fall back to English.
export const resources = {
  en: { translation: en },
} as const;

const requested = (import.meta.env.VITE_LOCALE as string | undefined) || navigator.language.split("-")[0];

void i18n.use(initReactI18next).init({
  resources,
  lng: requested in resources ? requested : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

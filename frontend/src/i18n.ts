import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "../public/locales/es/translation.json";

export const resources = {
  en: { translation: { ...en, language: { label: "Language", en: "English", es: "Español" }, nav: { ...en.nav, buyerVault: "Buyer vault" } } },
  es: { translation: es },
} as const;

const requested = (import.meta.env.VITE_LOCALE as string | undefined) || navigator.language.split("-")[0];

void i18n.use(initReactI18next).init({
  resources,
  lng: requested in resources ? requested : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
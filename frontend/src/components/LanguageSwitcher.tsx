import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  return (
    <label className="language-switcher">
      <span>{t("language.label", { defaultValue: "Language" })}</span>
      <select
        aria-label={t("language.label", { defaultValue: "Language" })}
        value={i18n.language.startsWith("es") ? "es" : "en"}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="en">{t("language.en", { defaultValue: "English" })}</option>
        <option value="es">{t("language.es", { defaultValue: "Español" })}</option>
      </select>
    </label>
  );
}
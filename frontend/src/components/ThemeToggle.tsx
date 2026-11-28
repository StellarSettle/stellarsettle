import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === "dark"}
    >
      {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

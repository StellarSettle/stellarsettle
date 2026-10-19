import { useEffect, useState } from "react";
import { applyTheme, getInitialTheme, useTheme } from "../hooks/useTheme";
import "../theme.css";
import "../responsive.css";

applyTheme(getInitialTheme());

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="shell-fab theme-toggle" onClick={toggle} aria-label={`Switch to ${next} theme`} aria-pressed={theme === "dark"}>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

function NavToggle() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-nav-open", open);
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest(".primary-nav a")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, [open]);
  return (
    <>
      <button type="button" className="shell-fab nav-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="app-sidebar-drawer" aria-label={open ? "Close menu" : "Open menu"}>
        {open ? "Close" : "Menu"}
      </button>
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
    </>
  );
}

export default function ShellControls() {
  useEffect(() => {
    const aside = document.querySelector(".sidebar");
    if (aside && !aside.id) aside.id = "app-sidebar-drawer";
    const main = document.querySelector("main.main-area");
    if (main && !main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  }, []);
  return (
    <>
      <a className="skip-link" href="#overview">Skip to main content</a>
      <div className="shell-controls">
        <NavToggle />
        <ThemeToggle />
      </div>
    </>
  );
}

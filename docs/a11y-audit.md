# Accessibility and responsive audit

Manual code/CSS review of the dashboard against WCAG 2.1 AA. An automated axe run should still be done in CI or the browser.

## Findings and fixes
- No skip link: added "Skip to main content" (`ShellControls.tsx`); `main` made programmatically focusable.
- Focus indicators were subtle: added a high-contrast `:focus-visible` outline (`a11y.css`).
- Low-contrast muted text, nav counts, table headers and status pills: darkened to >= 4.5:1 in both themes (`a11y.css`).
- Icon-only buttons already carry `aria-label`; the new menu and theme toggles expose `aria-expanded`/`aria-pressed`.
- Motion: `prefers-reduced-motion` is respected.

## Responsive
- Below 768px the fixed bottom bar is replaced by a toggleable drawer (Escape, backdrop click and link click close it).
- Page-level horizontal overflow is clipped and wide tables scroll inside their panel; touch targets are at least 40px (`responsive.css`).

## Theme and errors
- `data-theme` on `<html>`, persisted in `localStorage`, defaulting to `prefers-color-scheme` (`theme.css`, `hooks/useTheme.ts`).
- `ErrorBoundary` shows a fallback with "Try again" and "Reload page".

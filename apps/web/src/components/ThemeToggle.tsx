import { useEffect, useState } from "react";

type Theme = "dark" | "light";

// v2 key — ignores stale "theme" values written by old code that always defaulted to dark
const STORAGE_KEY = "playarm_theme_v2";

export function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle("dark", theme === "dark");
}

function systemTheme(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved === "light" || saved === "dark") ? (saved as Theme) : systemTheme();
    });

    useEffect(() => {
        applyTheme(theme);
        // Do NOT auto-save here — only manual toggles are persisted (see onClick)
    }, [theme]);

    function toggle() {
        const next: Theme = theme === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, next);
        setTheme(next);
    }

    return (
        <button
            className="theme-icon-toggle"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            type="button"
        >
            {theme === "dark" ? (
                /* sun */
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
            ) : (
                /* moon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            )}
        </button>
    );
}
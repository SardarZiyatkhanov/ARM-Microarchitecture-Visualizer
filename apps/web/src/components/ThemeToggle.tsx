import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("theme");
        return (saved === "light" || saved === "dark") ? (saved as Theme) : "dark";
    });

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    return (
        <div className="theme-toggle">
            <span className="theme-label">Theme</span>

            <div className="theme-buttons">
                <button
                    className={`btn btn-outline ${theme === "dark" ? "theme-active" : ""}`}
                    onClick={() => setTheme("dark")}
                    type="button"
                >
                    Dark
                </button>

                <button
                    className={`btn btn-outline ${theme === "light" ? "theme-active" : ""}`}
                    onClick={() => setTheme("light")}
                    type="button"
                >
                    Light
                </button>
            </div>
        </div>
    );
}
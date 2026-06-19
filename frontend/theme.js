const themeToggleBtn = document.getElementById("themeToggleBtn");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function getStoredTheme() {
    return window.localStorage.getItem("theme");
}

function getPreferredTheme() {
    return getStoredTheme() || "dark";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const label = theme === "dark" ? "Light mode" : "Dark mode";
    if (themeToggleBtn) {
        themeToggleBtn.querySelector(".btn-label").innerText = label;
    }
    window.localStorage.setItem("theme", theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || (prefersDark.matches ? "dark" : "light");
    applyTheme(current === "dark" ? "light" : "dark");
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
}

applyTheme(getPreferredTheme());

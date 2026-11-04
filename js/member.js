import { onSessionChange } from "./auth.js";
import { supabase } from "./supabase.js";
// ==================================================
// MITGLIEDERBEREICH
// Sichtbar ist er über body.is-authenticated (siehe auth.ts + _member.scss).
// Hier werden nur die Inhalte befüllt und die Navigation gesteuert.
// ==================================================
const SECTION_IDS = [
    "member-area",
    "member-cards",
    "member-skills",
    "member-news",
    "member-stats",
];
export function initMember() {
    const area = document.querySelector("#member-area");
    if (!area) {
        return;
    }
    let wasLoggedIn = false;
    // =========================
    // HILFSFUNKTIONEN
    // =========================
    function getDisplayName(session) {
        const meta = session.user.user_metadata;
        return meta?.username ?? session.user.email?.split("@")[0] ?? "Siedler";
    }
    function getInitials(name) {
        const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.trim().slice(0, 2).toUpperCase() || "GV";
    }
    function formatLastLogin(isoDate) {
        if (!isoDate) {
            return "–";
        }
        const date = new Date(isoDate);
        const now = new Date();
        const time = date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayDifference = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
        if (dayDifference === 0) {
            return `Heute, ${time} Uhr`;
        }
        if (dayDifference === 1) {
            return `Gestern, ${time} Uhr`;
        }
        return `${date.toLocaleDateString("de-DE")}, ${time} Uhr`;
    }
    // =========================
    // INHALTE BEFÜLLEN
    // =========================
    function fillMemberData(session) {
        const name = getDisplayName(session);
        const initials = getInitials(name);
        document.querySelectorAll("[data-member-name]").forEach((element) => {
            element.textContent = name;
        });
        document.querySelectorAll("[data-member-initials]").forEach((element) => {
            element.textContent = initials;
        });
        const headerAvatar = document.querySelector("#auth-user-avatar");
        if (headerAvatar) {
            headerAvatar.textContent = initials;
        }
        const lastLogin = document.querySelector("#member-last-login");
        if (lastLogin) {
            lastLogin.textContent = formatLastLogin(session.user.last_sign_in_at);
        }
    }
    onSessionChange((session) => {
        const loggedIn = session !== null;
        if (session) {
            fillMemberData(session);
        }
        // Beim Wechsel ausgeloggt <-> eingeloggt wieder nach oben springen
        if (loggedIn !== wasLoggedIn) {
            window.scrollTo(0, 0);
            wasLoggedIn = loggedIn;
        }
    });
    // =========================
    // ABMELDEN (Sidebar)
    // =========================
    document.querySelector("#member-logout")?.addEventListener("click", () => {
        void supabase.auth.signOut();
    });
    // =========================
    // AKTIVEN MENÜPUNKT MARKIEREN
    // =========================
    const menuLinks = document.querySelectorAll(".member-menu__link[data-member-link], .nav-link--member");
    function setActive(id) {
        menuLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("is-active", link.classList.contains("member-menu__link") && isActive);
            link.classList.toggle("active", link.classList.contains("nav-link") && isActive);
        });
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                setActive(entry.target.id);
            }
        });
    }, { rootMargin: "-35% 0px -55% 0px" });
    SECTION_IDS.slice(1).forEach((id) => {
        const section = document.getElementById(id);
        if (section) {
            observer.observe(section);
        }
    });
    window.addEventListener("scroll", () => {
        if (window.scrollY < 160) {
            setActive("member-area");
        }
    });
    // =========================
    // "KOMMT BALD"-HINWEIS
    // =========================
    const toast = document.createElement("div");
    toast.className = "member-toast";
    toast.setAttribute("role", "status");
    toast.textContent = "Dieser Bereich kommt bald.";
    document.body.appendChild(toast);
    let toastTimer;
    document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-soon]");
        if (!target) {
            return;
        }
        event.preventDefault();
        toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 2200);
    });
}
//# sourceMappingURL=member.js.map
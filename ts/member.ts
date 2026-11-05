import type { Session } from "@supabase/supabase-js";
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
    "member-minigames",
];

// Markiert den passenden Menüpunkt (Sidebar + Header) anhand seines href, z. B. "#member-skills"
export function setActiveMenu(href: string): void {
    document
        .querySelectorAll<HTMLAnchorElement>(".member-menu__link[data-member-link], .nav-link--member")
        .forEach((link) => {
            const isActive = link.getAttribute("href") === href;

            link.classList.toggle("is-active", link.classList.contains("member-menu__link") && isActive);
            link.classList.toggle("active", link.classList.contains("nav-link") && isActive);
        });
}

export function initMember(): void {
    const area = document.querySelector<HTMLElement>("#member-area");

    if (!area) {
        return;
    }

    let wasLoggedIn = false;

    // =========================
    // HILFSFUNKTIONEN
    // =========================

    function getDisplayName(session: Session): string {
        const meta = session.user.user_metadata as { username?: string } | undefined;

        return meta?.username ?? session.user.email?.split("@")[0] ?? "Siedler";
    }

    function getInitials(name: string): string {
        const parts = name.trim().split(/[\s._-]+/).filter(Boolean);

        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }

        return name.trim().slice(0, 2).toUpperCase() || "GV";
    }

    function formatLastLogin(isoDate: string | undefined): string {
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
        const dayDifference = Math.round(
            (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000
        );

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

    function fillMemberData(session: Session): void {
        const name = getDisplayName(session);
        const initials = getInitials(name);

        document.querySelectorAll<HTMLElement>("[data-member-name]").forEach((element) => {
            element.textContent = name;
        });

        document.querySelectorAll<HTMLElement>("[data-member-initials]").forEach((element) => {
            element.textContent = initials;
        });

        const headerAvatar = document.querySelector<HTMLElement>("#auth-user-avatar");

        if (headerAvatar) {
            headerAvatar.textContent = initials;
        }

        const lastLogin = document.querySelector<HTMLElement>("#member-last-login");

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

    document.querySelector<HTMLButtonElement>("#member-logout")?.addEventListener("click", () => {
        void supabase.auth.signOut();
    });

    // =========================
    // AKTIVEN MENÜPUNKT MARKIEREN
    // =========================

    function setActive(id: string): void {
        setActiveMenu(`#${id}`);
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                // Ganz oben bleibt "Mitgliederbereich" aktiv, sonst nur wenn das Dashboard sichtbar ist
                const dashboardVisible = !document.querySelector<HTMLElement>("#member-dashboard")?.hidden;

                if (entry.isIntersecting && dashboardVisible && window.scrollY >= 160) {
                    setActive(entry.target.id);
                }
            });
        },
        { rootMargin: "-35% 0px -55% 0px" }
    );

    SECTION_IDS.slice(1).forEach((id) => {
        const section = document.getElementById(id);

        if (section) {
            observer.observe(section);
        }
    });

    setActive("member-area");

    window.addEventListener("scroll", () => {
        const dashboardVisible = !document.querySelector<HTMLElement>("#member-dashboard")?.hidden;

        if (dashboardVisible && window.scrollY < 160) {
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

    let toastTimer: number | undefined;

    document.addEventListener("click", (event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>("[data-soon]");

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

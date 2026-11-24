import { isMapCategory, renderMaps } from "./maps.js";
import { setActiveMenu } from "./member.js";
import { renderMinigames, renderMinigamesTeaser } from "./minigames.js";
import { renderSimulator, renderSimulatorTeaser } from "./simulator.js";
import { initSkillBuilds, isSkillBuildsHash, leaveSkillBuilds, renderSkillBuilds } from "./skill-builds-view.js";
import { renderSpecialists } from "./specialists.js";
import { TACTIC_HASH, leaveTactic, renderTacticView } from "./tactic-view.js";

// ==================================================
// UNTERSEITEN IM MITGLIEDERBEREICH
// #generaele, #entdecker, #bevorzugte-skills, #kampfsimulator, #minigames, #karten-<kategorie>, #taktikkarte-<id>
// Alles andere zeigt das Dashboard (und scrollt zu einem Abschnitt).
// ==================================================

export function initViews(): void {
    const dashboard = document.querySelector<HTMLElement>("#member-dashboard");
    const view = document.querySelector<HTMLElement>("#member-view");

    if (!dashboard || !view) {
        return;
    }

    initSkillBuilds();

    const teaser = document.querySelector<HTMLElement>("#minigames-teaser");

    if (teaser) {
        renderMinigamesTeaser(teaser);
    }

    const simTeaser = document.querySelector<HTMLElement>("#sim-teaser");

    if (simTeaser) {
        renderSimulatorTeaser(simTeaser);
    }

    function showView(menuHref: string): void {
        dashboard!.hidden = true;
        view!.hidden = false;
        setActiveMenu(menuHref);
        window.scrollTo(0, 0);
    }

    // Alle IDs der öffentlichen Startseite (home, history, founder, about, news, guild …)
    const publicIds = new Set(
        Array.from(document.querySelectorAll<HTMLElement>(".public-site [id]")).map((element) => element.id)
    );

    let wasHomeView = false;

    function route(): void {
        const hash = decodeURIComponent(window.location.hash.slice(1));

        if (!hash.startsWith(TACTIC_HASH)) {
            leaveTactic();
        }

        // Startseite (für Mitglieder per "Startseite" erreichbar)
        const isHomeView = publicIds.has(hash);

        document.body.classList.toggle("is-home-view", isHomeView);

        if (isHomeView) {
            wasHomeView = true;

            // erst nach dem Einblenden scrollen, sonst ist das Ziel noch unsichtbar
            window.requestAnimationFrame(() => {
                if (hash === "home") {
                    window.scrollTo(0, 0);
                } else {
                    document.getElementById(hash)?.scrollIntoView();
                }
            });

            return;
        }

        if (hash === "generaele") {
            renderSpecialists(view!, "generals");
            showView("#member-skills");
            return;
        }

        if (hash === "entdecker") {
            renderSpecialists(view!, "explorers");
            showView("#member-skills");
            return;
        }

        if (isSkillBuildsHash(hash)) {
            void renderSkillBuilds(view!);
            showView("#member-skills");
            return;
        }

        if (hash.startsWith(TACTIC_HASH)) {
            leaveSkillBuilds();
            void renderTacticView(view!, hash.slice(TACTIC_HASH.length));
            showView("#member-cards");
            return;
        }

        leaveSkillBuilds();

        if (hash === "kampfsimulator") {
            renderSimulator(view!);
            showView("#kampfsimulator");
            return;
        }

        if (hash === "minigames") {
            renderMinigames(view!);
            showView("#minigames");
            return;
        }

        if (hash.startsWith("karten-") && isMapCategory(hash.slice(7))) {
            renderMaps(view!, hash.slice(7) as Parameters<typeof renderMaps>[1]);
            showView("#member-cards");
            return;
        }

        // Dashboard
        const wasHidden = dashboard!.hidden || wasHomeView;

        wasHomeView = false;

        dashboard!.hidden = false;
        view!.hidden = true;
        view!.innerHTML = "";

        if (wasHidden) {
            const target = hash ? document.getElementById(hash) : null;

            if (target) {
                target.scrollIntoView();
            } else {
                window.scrollTo(0, 0);
            }
        }
    }

    window.addEventListener("hashchange", route);

    // Ganze Skill-/Karten-Kachel klickbar machen
    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;

        if (target.closest("a, button")) {
            return;
        }

        const go = target.closest<HTMLElement>("[data-go]");

        if (go?.dataset.go) {
            window.location.hash = go.dataset.go;
        }
    });

    route();
}

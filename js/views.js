import { isMapCategory, renderMaps } from "./maps.js";
import { setActiveMenu } from "./member.js";
import { renderMinigames, renderMinigamesTeaser } from "./minigames.js";
import { renderSimulator, renderSimulatorTeaser } from "./simulator.js";
import { renderSpecialists } from "./specialists.js";
// ==================================================
// UNTERSEITEN IM MITGLIEDERBEREICH
// #generaele, #entdecker, #kampfsimulator, #minigames, #karten-<kategorie>
// Alles andere zeigt das Dashboard (und scrollt zu einem Abschnitt).
// ==================================================
export function initViews() {
    const dashboard = document.querySelector("#member-dashboard");
    const view = document.querySelector("#member-view");
    if (!dashboard || !view) {
        return;
    }
    const teaser = document.querySelector("#minigames-teaser");
    if (teaser) {
        renderMinigamesTeaser(teaser);
    }
    const simTeaser = document.querySelector("#sim-teaser");
    if (simTeaser) {
        renderSimulatorTeaser(simTeaser);
    }
    function showView(menuHref) {
        dashboard.hidden = true;
        view.hidden = false;
        setActiveMenu(menuHref);
        window.scrollTo(0, 0);
    }
    function route() {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash === "generaele") {
            renderSpecialists(view, "generals");
            showView("#member-skills");
            return;
        }
        if (hash === "entdecker") {
            renderSpecialists(view, "explorers");
            showView("#member-skills");
            return;
        }
        if (hash === "kampfsimulator") {
            renderSimulator(view);
            showView("#kampfsimulator");
            return;
        }
        if (hash === "minigames") {
            renderMinigames(view);
            showView("#minigames");
            return;
        }
        if (hash.startsWith("karten-") && isMapCategory(hash.slice(7))) {
            renderMaps(view, hash.slice(7));
            showView("#member-cards");
            return;
        }
        // Dashboard
        const wasHidden = dashboard.hidden;
        dashboard.hidden = false;
        view.hidden = true;
        view.innerHTML = "";
        if (wasHidden) {
            const target = hash ? document.getElementById(hash) : null;
            if (target) {
                target.scrollIntoView();
            }
            else {
                window.scrollTo(0, 0);
            }
        }
    }
    window.addEventListener("hashchange", route);
    // Ganze Skill-/Karten-Kachel klickbar machen
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (target.closest("a, button")) {
            return;
        }
        const go = target.closest("[data-go]");
        if (go?.dataset.go) {
            window.location.hash = go.dataset.go;
        }
    });
    route();
}
//# sourceMappingURL=views.js.map
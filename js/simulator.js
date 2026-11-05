import { SIMULATOR } from "./data/tools.js";
import { attachImageFallback, esc } from "./dom.js";
// ==================================================
// KAMPFSIMULATOR (NEONFRONT) – eingebettet per iframe
// ==================================================
export function renderSimulator(root) {
    root.innerHTML = `
        <a href="#member-sim" class="view-back">← Zurück zum Mitgliederbereich</a>

        <div class="view-title">
            <svg class="member-panel__icon"><use href="#i-swords" /></svg>
            <div>
                <h2>Kampfsimulator</h2>
                <p>${esc(SIMULATOR.title)} – ${esc(SIMULATOR.subtitle)}. Läuft live von GitHub Pages, deine Skillungen werden im Browser gespeichert.</p>
            </div>
        </div>

        <div class="view-toolbar view-toolbar--buttons">
            <button type="button" class="game-button game-button--primary" id="sim-fullscreen">Vollbild</button>
            <a class="game-button" href="${esc(SIMULATOR.liveUrl)}" target="_blank" rel="noopener noreferrer">In neuem Tab öffnen</a>
            <a class="game-button" href="${esc(SIMULATOR.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>

        <iframe
            class="sim-frame"
            id="sim-frame"
            src="${esc(SIMULATOR.liveUrl)}"
            title="${esc(SIMULATOR.title)} – ${esc(SIMULATOR.subtitle)}"
            allow="fullscreen"
        ></iframe>

        <p class="view-source">
            Inoffizielles Fan-Projekt, nicht mit CipSoft oder Ubisoft verbunden. Alle Ergebnisse sind Simulationen ohne Gewähr.
        </p>
    `;
    const frame = root.querySelector("#sim-frame");
    root.querySelector("#sim-fullscreen")?.addEventListener("click", () => {
        void frame?.requestFullscreen?.();
    });
}
// Vorschau-Kachel auf dem Dashboard
export function renderSimulatorTeaser(target) {
    target.innerHTML = `
        <a href="#kampfsimulator" class="sim-feature__preview" aria-label="Kampfsimulator öffnen">
            <img src="${esc(SIMULATOR.image)}" alt="Vorschau ${esc(SIMULATOR.title)}" loading="lazy" data-fallback="${esc(SIMULATOR.title)}" />
            <span class="sim-feature__play">▶ Jetzt starten</span>
        </a>

        <div class="sim-feature__info">
            <h3>${esc(SIMULATOR.title)} <small>${esc(SIMULATOR.subtitle)}</small></h3>
            <p>${esc(SIMULATOR.description)}</p>

            <ul>
                ${SIMULATOR.features.map((feature) => `<li>${esc(feature)}</li>`).join("")}
            </ul>

            <div class="sim-feature__actions">
                <a href="#kampfsimulator" class="game-button game-button--primary">Hier starten</a>
                <a href="${esc(SIMULATOR.liveUrl)}" class="game-button" target="_blank" rel="noopener noreferrer">In neuem Tab</a>
                <a href="${esc(SIMULATOR.githubUrl)}" class="game-button" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
        </div>
    `;
    attachImageFallback(target);
}
//# sourceMappingURL=simulator.js.map
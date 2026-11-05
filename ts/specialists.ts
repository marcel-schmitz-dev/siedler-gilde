import { EXPLORERS, GENERALS, TSOWIKI_BASE, TSOWIKI_PAGE } from "./data/specialists.js";
import type { Explorer, General, SkillTile } from "./data/specialists.js";
import { attachImageFallback, esc, initials, openDialog } from "./dom.js";

export type SpecialistKind = "generals" | "explorers";

// ==================================================
// FORMATIERUNG
// ==================================================

function formatMinutes(minutes: number): string {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const rest = Math.round(minutes % 60);

        if (rest === 0) {
            return hours === 1 ? "1 Stunde" : `${hours} Stunden`;
        }

        return `${hours}:${String(rest).padStart(2, "0")} Stunden`;
    }

    const whole = Math.floor(minutes);
    const seconds = Math.round((minutes - whole) * 60);

    return seconds > 0 ? `${whole}:${String(seconds).padStart(2, "0")} Minuten` : `${whole} Minuten`;
}

function maxDamage(damage: string): number {
    const parts = damage.split("-").map(Number);

    return Math.max(...parts.filter((value) => !Number.isNaN(value)), 0);
}

function skillName(tile: SkillTile): string {
    if (tile.label) {
        return tile.label;
    }

    // Fallback: Icon-Name lesbar machen ("garrison_annex" -> "Garrison annex")
    const text = tile.icon.replace(/[_-]+/g, " ").replace(/\d+$/, "").trim();

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function statRows(general: General): Array<[string, string]> {
    return [
        ["Garnison", String(general.capacity)],
        ["Reisezeit", formatMinutes(general.travelMin)],
        ["Rundendauer", `${general.roundSec} Sekunden`],
        ["Erholung", formatMinutes(general.recoveryMin)],
        ["Leben", general.hp.toLocaleString("de-DE")],
        ["Angriff", general.damage],
        ["Treffsicherheit", `${general.accuracy} %`],
        ["Initiative", general.initiative],
    ];
}

function statsHtml(general: General): string {
    return `
        <dl class="spec-stats">
            ${statRows(general)
                .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
                .join("")}
        </dl>`;
}

function tagsHtml(general: General): string {
    return general.abilities.map((ability) => `<span class="spec-tag">${esc(ability)}</span>`).join("");
}

// ==================================================
// DETAIL-FENSTER
// ==================================================

function skillMatrixHtml(skills: SkillTile[]): string {
    return `
        <div class="skill-matrix">
            ${skills
                .map((tile) => {
                    const state = tile.level === 0 ? "is-empty" : tile.level === tile.max ? "is-full" : "is-part";
                    const name = skillName(tile);
                    const src = `${TSOWIKI_BASE}/icons/skills/${encodeURIComponent(tile.icon)}.webp`;

                    return `
                        <div class="skill-tile ${state}" title="${esc(name)}">
                            <img src="${src}" alt="" loading="lazy" data-fallback="${esc(name)}" />
                            <span class="skill-tile__level">${tile.level}/${tile.max}</span>
                        </div>`;
                })
                .join("")}
        </div>`;
}

function openGeneral(general: General): void {
    const visual = general.garrison
        ? `<img src="${TSOWIKI_BASE}/images/buildings/${encodeURIComponent(general.garrison)}.webp" alt="Garnison von ${esc(general.name)}" data-fallback="Garnison" />`
        : `<img src="./assets/img/logo/gvg-wappen.webp" alt="" class="dlg-crest" />`;

    const skills = general.skills
        ? `
            <section class="dlg-section">
                <h4>Vorschlag zur Fähigkeitenverteilung</h4>
                <p class="dlg-note">Wellenskillung</p>
                ${skillMatrixHtml(general.skills)}
            </section>`
        : "";

    const origin = general.origin
        ? `
            <section class="dlg-section">
                <h4>Herkunft</h4>
                <ul class="dlg-list">${general.origin.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
            </section>`
        : "";

    const missing =
        !general.skills || !general.origin
            ? `<p class="dlg-hint">Fähigkeiten-Vorschlag und Herkunft sind für diesen General hier noch nicht eingetragen – die Details findest du auf TSOwiki.</p>`
            : "";

    openDialog(
        `
        <header class="dlg-head">
            <span class="spec-avatar">${esc(initials(general.name))}</span>
            <div>
                <h3>${esc(general.name)}</h3>
                <div class="spec-tags">${tagsHtml(general)}</div>
            </div>
        </header>

        <div class="dlg-cols">
            <div class="dlg-visual">${visual}</div>
            <div>
                ${general.special ? `<p class="dlg-special">${esc(general.special)}</p>` : ""}
                ${statsHtml(general)}
            </div>
        </div>

        ${skills}
        ${origin}
        ${missing}

        <a class="dlg-link" href="${TSOWIKI_PAGE}${general.slug}/" target="_blank" rel="noopener noreferrer">
            Alle Details auf TSOwiki ansehen
        </a>`,
        "member-dialog--wide"
    );
}

function openExplorer(explorer: Explorer): void {
    openDialog(
        `
        <header class="dlg-head">
            <span class="spec-avatar">${esc(initials(explorer.name))}</span>
            <div>
                <h3>${esc(explorer.name)}</h3>
                <div class="spec-tags"><span class="spec-tag spec-tag--gold">${explorer.speed} % Aufgabentempo</span></div>
            </div>
        </header>

        ${explorer.special ? `<p class="dlg-special">${esc(explorer.special)}</p>` : `<p class="dlg-note">Keine besondere Fähigkeit – nur das Aufgabentempo.</p>`}

        <p class="dlg-hint">Herkunft und weitere Details stehen auf TSOwiki.</p>

        <a class="dlg-link" href="${TSOWIKI_PAGE}${explorer.slug}/" target="_blank" rel="noopener noreferrer">
            Alle Details auf TSOwiki ansehen
        </a>`
    );
}

// ==================================================
// LISTE
// ==================================================

const GENERAL_SORTS: Record<string, (a: General, b: General) => number> = {
    standard: () => 0,
    name: (a, b) => a.name.localeCompare(b.name, "de"),
    capacity: (a, b) => b.capacity - a.capacity,
    hp: (a, b) => b.hp - a.hp,
    damage: (a, b) => maxDamage(b.damage) - maxDamage(a.damage),
    accuracy: (a, b) => b.accuracy - a.accuracy,
    travel: (a, b) => a.travelMin - b.travelMin,
    recovery: (a, b) => a.recoveryMin - b.recoveryMin,
};

const EXPLORER_SORTS: Record<string, (a: Explorer, b: Explorer) => number> = {
    standard: () => 0,
    name: (a, b) => a.name.localeCompare(b.name, "de"),
    speed: (a, b) => b.speed - a.speed,
};

function generalCard(general: General): string {
    return `
        <article class="spec-card" data-slug="${general.slug}" tabindex="0">
            <header>
                <span class="spec-avatar">${esc(initials(general.name))}</span>
                <h3>${esc(general.name)}</h3>
            </header>
            ${general.abilities.length ? `<div class="spec-tags">${tagsHtml(general)}</div>` : ""}
            ${general.special ? `<p class="spec-card__special">${esc(general.special)}</p>` : ""}
            ${statsHtml(general)}
            <button type="button" class="spec-card__more">Details ansehen →</button>
        </article>`;
}

function explorerCard(explorer: Explorer): string {
    return `
        <article class="spec-card spec-card--explorer" data-slug="${explorer.slug}" tabindex="0">
            <header>
                <span class="spec-avatar">${esc(initials(explorer.name))}</span>
                <h3>${esc(explorer.name)}</h3>
            </header>
            <div class="spec-tags"><span class="spec-tag spec-tag--gold">${explorer.speed} % Aufgabentempo</span></div>
            ${explorer.special ? `<p class="spec-card__special">${esc(explorer.special)}</p>` : ""}
            <button type="button" class="spec-card__more">Details ansehen →</button>
        </article>`;
}

export function renderSpecialists(root: HTMLElement, kind: SpecialistKind): void {
    const isGeneral = kind === "generals";
    const title = isGeneral ? "Generäle" : "Entdecker";
    const icon = isGeneral ? "i-helmet" : "i-compass";
    const intro = isGeneral
        ? "Alle Generäle mit Garnison, Werten und Besonderheiten – klicke auf einen General für Fähigkeiten-Vorschlag und Herkunft."
        : "Alle Entdecker mit Aufgabentempo und Besonderheiten – suche nach Name oder Fähigkeit.";

    const sortOptions = isGeneral
        ? `<option value="standard">Standard</option>
           <option value="name">Name (A–Z)</option>
           <option value="capacity">Garnison</option>
           <option value="hp">Lebenspunkte</option>
           <option value="damage">Angriff</option>
           <option value="accuracy">Treffsicherheit</option>
           <option value="travel">Reisezeit</option>
           <option value="recovery">Erholungszeit</option>`
        : `<option value="standard">Standard</option>
           <option value="name">Name (A–Z)</option>
           <option value="speed">Aufgabentempo</option>`;

    root.innerHTML = `
        <a href="#member-skills" class="view-back">← Zurück zum Mitgliederbereich</a>

        <div class="view-title">
            <svg class="member-panel__icon"><use href="#${icon}" /></svg>
            <div>
                <h2>${title}</h2>
                <p>${intro}</p>
            </div>
        </div>

        <div class="view-toolbar">
            <label class="view-field view-field--search">
                <span>Suche</span>
                <input type="search" id="spec-search" placeholder="Nach Name oder Besonderheit suchen …" autocomplete="off" />
            </label>

            <label class="view-field">
                <span>Sortieren nach</span>
                <select id="spec-sort">${sortOptions}</select>
            </label>

            <span class="view-count" id="spec-count" aria-live="polite"></span>
        </div>

        <div class="spec-grid" id="spec-grid"></div>

        <p class="view-source">
            Werte nach <a href="https://tsowiki.eu/de/specialists/${isGeneral ? "generale" : "entdecker"}/" target="_blank" rel="noopener noreferrer">tsowiki.eu</a>
            (inoffizielles Fan-Wiki). Grafiken und Texte von Die Siedler Online © Ubisoft.
        </p>
    `;

    const grid = root.querySelector<HTMLElement>("#spec-grid")!;
    const search = root.querySelector<HTMLInputElement>("#spec-search")!;
    const sort = root.querySelector<HTMLSelectElement>("#spec-sort")!;
    const count = root.querySelector<HTMLElement>("#spec-count")!;

    function update(): void {
        const query = search.value.trim().toLowerCase();

        if (isGeneral) {
            const list = GENERALS.filter((item) => `${item.name} ${item.special}`.toLowerCase().includes(query))
                .map((item, index) => ({ item, index }))
                .sort((a, b) => GENERAL_SORTS[sort.value](a.item, b.item) || a.index - b.index)
                .map(({ item }) => item);

            grid.innerHTML = list.map(generalCard).join("");
            count.textContent = `${list.length} von ${GENERALS.length}`;
            grid.dataset.empty = String(list.length === 0);
        } else {
            const list = EXPLORERS.filter((item) => `${item.name} ${item.special}`.toLowerCase().includes(query))
                .map((item, index) => ({ item, index }))
                .sort((a, b) => EXPLORER_SORTS[sort.value](a.item, b.item) || a.index - b.index)
                .map(({ item }) => item);

            grid.innerHTML = list.map(explorerCard).join("");
            count.textContent = `${list.length} von ${EXPLORERS.length}`;
            grid.dataset.empty = String(list.length === 0);
        }

        if (!grid.children.length) {
            grid.innerHTML = `<p class="view-empty">Nichts gefunden – passe deine Suche an.</p>`;
        }

        attachImageFallback(grid);
    }

    function openFromCard(card: HTMLElement | null): void {
        if (!card) {
            return;
        }

        const slug = card.dataset.slug;

        if (isGeneral) {
            const general = GENERALS.find((item) => item.slug === slug);

            if (general) {
                openGeneral(general);
            }
        } else {
            const explorer = EXPLORERS.find((item) => item.slug === slug);

            if (explorer) {
                openExplorer(explorer);
            }
        }
    }

    search.addEventListener("input", update);
    sort.addEventListener("change", update);

    grid.addEventListener("click", (event) => {
        openFromCard((event.target as HTMLElement).closest<HTMLElement>(".spec-card"));
    });

    grid.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            const card = (event.target as HTMLElement).closest<HTMLElement>(".spec-card");

            if (card && event.target === card) {
                event.preventDefault();
                openFromCard(card);
            }
        }
    });

    update();
}

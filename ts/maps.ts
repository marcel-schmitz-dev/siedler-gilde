import { ADVENTURE_MAPS, MAP_CATEGORIES } from "./data/adventure-maps.js";
import type { AdventureMap, MapCategoryId } from "./data/adventure-maps.js";
import { attachImageFallback, esc, openDialog } from "./dom.js";

export function isMapCategory(id: string): id is MapCategoryId {
    return MAP_CATEGORIES.some((category) => category.id === id);
}

function fileName(map: AdventureMap): string {
    return map.image.split("/").pop() ?? "karte";
}

function openMap(map: AdventureMap): void {
    const dialog = openDialog(
        `
        <header class="dlg-head dlg-head--simple">
            <div>
                <h3>${esc(map.title)}</h3>
                ${map.author ? `<p class="dlg-note">von ${esc(map.author)}</p>` : ""}
            </div>
        </header>

        <div class="map-zoom" title="Klicken zum Vergrößern / Verkleinern">
            <img src="${esc(map.image)}" alt="Abenteuer-Karte ${esc(map.title)}" />
        </div>

        <div class="dlg-actions">
            <a class="game-button game-button--primary" href="${esc(map.image)}" download="${esc(fileName(map))}">Herunterladen</a>
            <a class="game-button" href="${esc(map.image)}" target="_blank" rel="noopener noreferrer">In neuem Tab öffnen</a>
        </div>`,
        "member-dialog--map"
    );

    const zoom = dialog.querySelector<HTMLElement>(".map-zoom");

    zoom?.addEventListener("click", () => zoom.classList.toggle("is-zoomed"));
}

export function renderMaps(root: HTMLElement, categoryId: MapCategoryId): void {
    const category = MAP_CATEGORIES.find((item) => item.id === categoryId)!;
    const maps = ADVENTURE_MAPS.filter((map) => map.category === categoryId);

    root.innerHTML = `
        <a href="#member-cards" class="view-back">← Zurück zum Mitgliederbereich</a>

        <div class="view-title">
            <svg class="member-panel__icon"><use href="#i-map" /></svg>
            <div>
                <h2>Abenteuer Karten: ${esc(category.title)}</h2>
                <p>${esc(category.description)} Klicke auf eine Karte für die Großansicht und den Download.</p>
            </div>
        </div>

        <nav class="map-tabs" aria-label="Kategorien">
            ${MAP_CATEGORIES.map(
                (item) =>
                    `<a href="#karten-${item.id}" class="map-tab${item.id === categoryId ? " is-active" : ""}">${esc(item.title)}</a>`
            ).join("")}
        </nav>

        <div class="map-grid">
            ${
                maps.length
                    ? maps
                          .map(
                              (map, index) => `
                <button type="button" class="map-card" data-index="${index}">
                    <span class="map-card__image">
                        <img src="${esc(map.image)}" alt="" loading="lazy" data-fallback="${esc(map.title)}" />
                    </span>
                    <span class="map-card__title">${esc(map.title)}</span>
                    ${map.author ? `<span class="map-card__author">von ${esc(map.author)}</span>` : ""}
                </button>`
                          )
                          .join("")
                    : `<p class="view-empty">Hier liegen noch keine Karten. Neue Karten trägst du in <code>ts/data/adventure-maps.ts</code> ein.</p>`
            }
        </div>
    `;

    attachImageFallback(root);

    root.querySelectorAll<HTMLButtonElement>(".map-card").forEach((button) => {
        button.addEventListener("click", () => {
            const map = maps[Number(button.dataset.index)];

            if (map) {
                openMap(map);
            }
        });
    });
}

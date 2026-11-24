import { MAP_CATEGORIES } from "./data/adventure-maps.js";
import { attachImageFallback, esc } from "./dom.js";
import { isAdmin, listMaps } from "./tactic-store.js";
import { TACTIC_HASH } from "./tactic-view.js";
import { openUploadDialog } from "./tactic-upload.js";
export function isMapCategory(id) {
    return MAP_CATEGORIES.some((category) => category.id === id);
}
function cardHtml(map) {
    return `
        <a href="#${TACTIC_HASH}${esc(map.id)}" class="map-card">
            <span class="map-card__image map-card__image--sea">
                ${map.thumbUrl ? `<img src="${esc(map.thumbUrl)}" alt="" loading="lazy" data-fallback="${esc(map.title)}" />` : ""}
                ${map.status === "pending" ? `<span class="map-badge map-badge--corner">Wartet auf Freigabe</span>` : ""}
            </span>
            <span class="map-card__title">${esc(map.title)}</span>
            ${map.username ? `<span class="map-card__author">von ${esc(map.username)}</span>` : ""}
        </a>`;
}
let renderId = 0;
export function renderMaps(root, categoryId) {
    const category = MAP_CATEGORIES.find((item) => item.id === categoryId);
    const current = ++renderId;
    root.innerHTML = `
        <a href="#member-cards" class="view-back">← Zurück zum Mitgliederbereich</a>

        <div class="view-title">
            <svg class="member-panel__icon"><use href="#i-map" /></svg>
            <div>
                <h2>Abenteuer Karten: ${esc(category.title)}</h2>
                <p>${esc(category.description)} Klicke auf eine Karte, um sie im Rahmen mit allen Angaben zu öffnen.</p>
            </div>
        </div>

        <nav class="map-tabs" aria-label="Kategorien">
            ${MAP_CATEGORIES.map((item) => `<a href="#karten-${item.id}" class="map-tab${item.id === categoryId ? " is-active" : ""}">${esc(item.title)}</a>`).join("")}
        </nav>

        <div class="map-actions">
            <button type="button" class="wiz-button" id="map-add">Neue Taktikkarte hinzufügen</button>
        </div>

        <p class="wiz-message" id="map-message" role="alert"></p>

        <div class="map-grid" id="map-grid"><p class="view-empty">Karten werden geladen …</p></div>
    `;
    const grid = root.querySelector("#map-grid");
    const message = root.querySelector("#map-message");
    let admin = false;
    root.querySelector("#map-add").addEventListener("click", () => {
        openUploadDialog(categoryId, admin, (id) => {
            window.location.hash = `${TACTIC_HASH}${id}`;
        });
    });
    void (async () => {
        const [result, isAdminUser] = await Promise.all([listMaps(categoryId), isAdmin()]);
        if (current !== renderId) {
            return;
        }
        admin = isAdminUser;
        message.textContent = result.error ?? "";
        grid.innerHTML = result.maps.length
            ? result.maps.map(cardHtml).join("")
            : `<p class="view-empty">Hier liegen noch keine Karten. Lade die erste hoch.</p>`;
        attachImageFallback(grid);
    })();
}
//# sourceMappingURL=maps.js.map
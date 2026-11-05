import { MINIGAMES } from "./data/minigames.js";
import { attachImageFallback, esc } from "./dom.js";
function linkButton(label, url, className) {
    if (!url) {
        return `<a href="#" class="${className}" data-soon>${label}</a>`;
    }
    return `<a href="${esc(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
function gameCard(game) {
    return `
        <article class="game-card">
            <div class="game-card__image">
                <img src="${esc(game.image)}" alt="${esc(game.title)}" loading="lazy" data-fallback="${esc(game.title)}" />
                ${game.badge ? `<span class="game-card__badge">${esc(game.badge)}</span>` : ""}
            </div>
            <h3>${esc(game.title)}</h3>
            ${game.description ? `<p>${esc(game.description)}</p>` : ""}
            <div class="game-card__actions">
                ${linkButton("Live Test", game.liveUrl, "game-button game-button--primary")}
                ${linkButton("GitHub", game.githubUrl, "game-button")}
            </div>
        </article>`;
}
export function renderMinigames(root) {
    root.innerHTML = `
        <a href="#member-area" class="view-back">← Zurück zum Mitgliederbereich</a>

        <div class="view-title">
            <svg class="member-panel__icon"><use href="#i-gamepad" /></svg>
            <div>
                <h2>Mini Games</h2>
                <p>Kleine Spiele aus der Gilde – direkt im Browser testen oder den Code auf GitHub ansehen.</p>
            </div>
        </div>

        <div class="game-grid">
            ${MINIGAMES.map(gameCard).join("")}

            <article class="game-card game-card--placeholder">
                <span aria-hidden="true">+</span>
                <p>Weitere Mini Games folgen</p>
            </article>
        </div>
    `;
    attachImageFallback(root);
}
// Kleine Vorschau auf dem Dashboard
export function renderMinigamesTeaser(target) {
    target.innerHTML = MINIGAMES.slice(0, 2)
        .map((game) => `
            <a href="#minigames" class="teaser-game">
                <img src="${esc(game.image)}" alt="" loading="lazy" data-fallback="${esc(game.title)}" />
                <span>${esc(game.title)}</span>
            </a>`)
        .join("");
    attachImageFallback(target);
}
//# sourceMappingURL=minigames.js.map
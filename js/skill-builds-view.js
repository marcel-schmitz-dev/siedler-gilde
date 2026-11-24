import { esc, openDialog } from "./dom.js";
import { SKILL_POINT_LIMIT, UNIT_TYPE_LABEL, booksByType, BOOK_LABEL, totalPoints } from "./data/skill-trees.js";
import { deleteBuild, findUnit, getCurrentUser, loadBuilds } from "./skill-builds.js";
import { treeHtml } from "./skill-tree-ui.js";
import { openSkillWizard } from "./skill-wizard.js";
// ==================================================
// UNTERSEITE "UNSERE BEVORZUGTEN SKILLS" (#bevorzugte-skills)
// ==================================================
const VIEW_HASH = "bevorzugte-skills";
let currentRoot = null;
function formatDate(iso) {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function booksText(build) {
    const books = booksByType(build.unitType, build.skills);
    return Object.keys(BOOK_LABEL)
        .filter((key) => books[key] > 0)
        .map((key) => `${books[key]} ${BOOK_LABEL[key]}`)
        .join(" · ");
}
export function avatar(abbr) {
    return `<span class="spec-avatar${abbr.length > 2 ? " spec-avatar--long" : ""}">${esc(abbr)}</span>`;
}
export function cardHtml(build, userId) {
    const unit = findUnit(build.unitType, build.unitSlug);
    return `
        <article class="build-card${build.userId === userId ? " is-mine" : ""}" data-id="${build.id}" tabindex="0">
            <header>
                ${avatar(unit.abbr)}
                <div>
                    <h3>${esc(unit.name)}</h3>
                    <p class="build-card__title">${build.title ? esc(build.title) : "Standard-Skillung"}</p>
                </div>
                <span class="spec-tag">${UNIT_TYPE_LABEL[build.unitType]}</span>
            </header>
            ${treeHtml(build.unitType, build.skills, "mini")}
            <footer>
                <span>von <b>${esc(build.username)}</b> · ${formatDate(build.createdAt)}</span>
                <span>${totalPoints(build.skills)}/${SKILL_POINT_LIMIT[build.unitType]} Bücher</span>
            </footer>
        </article>`;
}
export function openBuild(build, isMine, onChanged) {
    const unit = findUnit(build.unitType, build.unitSlug);
    const dialog = openDialog(`
        <header class="dlg-head">
            ${avatar(unit.abbr)}
            <div>
                <h3>${esc(unit.name)}</h3>
                <div class="spec-tags">
                    <span class="spec-tag spec-tag--gold">${UNIT_TYPE_LABEL[build.unitType]}</span>
                    ${build.title ? `<span class="spec-tag">${esc(build.title)}</span>` : ""}
                </div>
            </div>
        </header>
        <p class="dlg-note">Skillung von <b>${esc(build.username)}</b> · ${formatDate(build.createdAt)}</p>
        <p class="skill-points"><strong>${totalPoints(build.skills)} / ${SKILL_POINT_LIMIT[build.unitType]}</strong> Bücher
            <span class="skill-points__books">${esc(booksText(build))}</span></p>
        ${treeHtml(build.unitType, build.skills, "view")}
        ${isMine ? `<div class="dlg-actions"><p class="wiz-message" id="build-message" role="alert"></p><button type="button" class="wiz-button wiz-button--danger" id="build-delete">Meine Skillung löschen</button></div>` : ""}`, "member-dialog--wide");
    dialog.querySelector("#build-delete")?.addEventListener("click", async () => {
        if (!window.confirm("Diese Skillung wirklich löschen?")) {
            return;
        }
        const error = await deleteBuild(build.id);
        if (error) {
            dialog.querySelector("#build-message").textContent = error;
            return;
        }
        dialog.close();
        onChanged();
    });
    return dialog;
}
export async function renderSkillBuilds(root) {
    currentRoot = root;
    root.innerHTML = `
        <a href="#member-skills" class="view-back">← Zurück zum Mitgliederbereich</a>

        <div class="view-title">
            <svg class="member-panel__icon"><use href="#i-star" /></svg>
            <div>
                <h2>Unsere bevorzugten Skills</h2>
                <p>Skillungen von Gildenmitgliedern für Generäle, Entdecker und Geologen – klicke eine Karte für die Großansicht.</p>
            </div>
        </div>

        <div class="view-toolbar">
            <label class="view-field">
                <span>Art</span>
                <select id="build-type">
                    <option value="all">Alle</option>
                    <option value="general">Generäle</option>
                    <option value="explorer">Entdecker</option>
                    <option value="geologist">Geologen</option>
                </select>
            </label>
            <label class="view-field view-field--search">
                <span>Suche</span>
                <input type="search" id="build-search" placeholder="Spezialist, Ersteller oder Zusatz …" autocomplete="off" />
            </label>
            <label class="view-field">
                <span>Sortieren nach</span>
                <select id="build-sort">
                    <option value="new">Neueste zuerst</option>
                    <option value="unit">Spezialist (A–Z)</option>
                    <option value="user">Ersteller (A–Z)</option>
                </select>
            </label>
            <button type="button" class="member-outline-button" data-skill-add>Neuen Skill hinzufügen</button>
            <span class="view-count" id="build-count" aria-live="polite"></span>
        </div>

        <div class="build-grid" id="build-grid"><p class="view-empty">Skillungen werden geladen …</p></div>
    `;
    const grid = root.querySelector("#build-grid");
    const typeSelect = root.querySelector("#build-type");
    const search = root.querySelector("#build-search");
    const sort = root.querySelector("#build-sort");
    const count = root.querySelector("#build-count");
    const [user, result] = await Promise.all([getCurrentUser(), loadBuilds()]);
    if (currentRoot !== root) {
        return; // Nutzer ist inzwischen woanders hin gewechselt
    }
    if (result.error) {
        grid.innerHTML = `<p class="view-empty">${esc(result.error)}</p>`;
        return;
    }
    const builds = result.builds;
    function update() {
        const query = search.value.trim().toLowerCase();
        const list = builds
            .filter((b) => typeSelect.value === "all" || b.unitType === typeSelect.value)
            .filter((b) => `${findUnit(b.unitType, b.unitSlug)?.name} ${b.username} ${b.title}`.toLowerCase().includes(query))
            .sort((a, b) => {
            if (sort.value === "unit") {
                return findUnit(a.unitType, a.unitSlug).name.localeCompare(findUnit(b.unitType, b.unitSlug).name, "de");
            }
            if (sort.value === "user") {
                return a.username.localeCompare(b.username, "de");
            }
            return b.createdAt.localeCompare(a.createdAt);
        });
        grid.innerHTML = list.length
            ? list.map((b) => cardHtml(b, user?.id)).join("")
            : `<p class="view-empty">${builds.length ? "Keine Skillung passt zur Suche." : "Noch keine Skillungen – lege mit „Neuen Skill hinzufügen“ die erste an!"}</p>`;
        count.textContent = `${list.length} von ${builds.length}`;
        // Bilder, die nicht laden, durch den Namen ersetzen
        grid.querySelectorAll("img[data-fallback]").forEach((img) => {
            img.addEventListener("error", () => {
                const span = document.createElement("span");
                span.className = "img-fallback";
                span.textContent = img.dataset.fallback ?? "";
                img.replaceWith(span);
            }, { once: true });
        });
    }
    update();
    typeSelect.addEventListener("change", update);
    search.addEventListener("input", update);
    sort.addEventListener("change", update);
    function open(card) {
        const build = builds.find((b) => b.id === card?.dataset.id);
        if (build) {
            openBuild(build, build.userId === user?.id, () => void renderSkillBuilds(root));
        }
    }
    grid.addEventListener("click", (event) => open(event.target.closest(".build-card")));
    grid.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open(event.target.closest(".build-card"));
        }
    });
}
export function isSkillBuildsHash(hash) {
    return hash === VIEW_HASH;
}
export function leaveSkillBuilds() {
    currentRoot = null;
}
// Button "Neuen Skill hinzufügen" (Dashboard und Unterseite)
export function initSkillBuilds() {
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-skill-add]");
        if (!button) {
            return;
        }
        event.preventDefault();
        void openSkillWizard(() => {
            if (decodeURIComponent(window.location.hash.slice(1)) === VIEW_HASH && currentRoot) {
                void renderSkillBuilds(currentRoot);
            }
            else {
                window.location.hash = VIEW_HASH;
            }
        });
    });
}
//# sourceMappingURL=skill-builds-view.js.map
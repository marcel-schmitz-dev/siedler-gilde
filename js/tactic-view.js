import { MAP_CATEGORIES } from "./data/adventure-maps.js";
import { BATTLE_UNITS, findBattleUnit } from "./data/units.js";
import { esc, openDialog } from "./dom.js";
import { findUnit, getCurrentUser, loadBuilds } from "./skill-builds.js";
import { cardHtml, openBuild } from "./skill-builds-view.js";
import { mountTacticFrame } from "./tactic-frame.js";
import { LIMITS, addGeneral, deleteMap, getMap, isAdmin, loadGenerals, removeGeneral, setStatus, updateMap, } from "./tactic-store.js";
export const TACTIC_HASH = "taktikkarte-";
let frame = null;
let token = 0;
export function leaveTactic() {
    token += 1;
    frame?.destroy();
    frame = null;
}
function formatDate(iso) {
    return iso ? new Date(iso).toLocaleDateString("de-DE") : "";
}
const SLOT_TITLES = {
    generals: "Generäle",
    units: "Einheiten",
    specials: "Besonderheiten",
    tips: "Tipps",
};
export async function renderTacticView(root, id) {
    leaveTactic();
    const current = token;
    root.innerHTML = `<p class="view-empty">Taktikkarte wird geladen …</p>`;
    const [map, user, admin] = await Promise.all([getMap(id), getCurrentUser(), isAdmin()]);
    if (current !== token) {
        return;
    }
    if (!map || !user) {
        root.innerHTML = `
            <a href="#member-cards" class="view-back">← Zurück zu den Abenteuer Karten</a>
            <p class="view-empty">Diese Taktikkarte gibt es nicht oder sie ist noch nicht freigegeben.</p>`;
        return;
    }
    const canEdit = !map.isStatic && (admin || map.userId === user.id);
    const category = MAP_CATEGORIES.find((item) => item.id === map.category);
    root.innerHTML = `
        <a href="#karten-${map.category}" class="view-back">← Zurück zu ${esc(category?.title ?? "den Karten")}</a>

        <div id="tactic-host"></div>

        <div class="tactic-meta">
            <p class="tactic-meta__info">
                <b>${esc(map.title)}</b>
                ${map.username ? ` · von ${esc(map.username)}` : ""}${map.createdAt ? ` · ${formatDate(map.createdAt)}` : ""}
                ${map.status === "pending" ? `<span class="map-badge">Wartet auf Freigabe</span>` : ""}
            </p>
            <div class="tactic-meta__actions" id="tactic-actions"></div>
        </div>
        <p class="wiz-message" id="tactic-message" role="alert"></p>
    `;
    const message = root.querySelector("#tactic-message");
    const actions = root.querySelector("#tactic-actions");
    frame = mountTacticFrame(root.querySelector("#tactic-host"), {
        title: map.title,
        imageUrl: map.imageUrl,
        downloadUrl: map.downloadUrl,
        downloadName: map.downloadName,
        onSlot: (slot) => void openSlot(map, slot, canEdit, user.id),
    });
    const buttons = [];
    if (admin && !map.isStatic) {
        buttons.push(map.status === "pending"
            ? `<button type="button" class="wiz-button" data-act="approve">Freigeben</button>`
            : `<button type="button" class="wiz-button wiz-button--ghost" data-act="unapprove">Zurück in die Freigabe</button>`);
    }
    if (canEdit) {
        buttons.push(`<button type="button" class="wiz-button wiz-button--ghost" data-act="rename">Umbenennen</button>`);
        buttons.push(`<button type="button" class="wiz-button wiz-button--danger" data-act="delete">Karte löschen</button>`);
    }
    actions.innerHTML = buttons.join("");
    actions.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-act]");
        if (!button) {
            return;
        }
        const act = button.dataset.act;
        if (act === "approve" || act === "unapprove") {
            button.disabled = true;
            const error = await setStatus(map.id, act === "approve" ? "approved" : "pending");
            if (error) {
                message.textContent = error;
                button.disabled = false;
                return;
            }
            void renderTacticView(root, map.id);
        }
        if (act === "rename") {
            openRename(map, () => void renderTacticView(root, map.id));
        }
        if (act === "delete") {
            if (!window.confirm(`Die Taktikkarte „${map.title}“ samt allen Angaben wirklich löschen?`)) {
                return;
            }
            button.disabled = true;
            const error = await deleteMap(map);
            if (error) {
                message.textContent = error;
                button.disabled = false;
                return;
            }
            window.location.hash = `karten-${map.category}`;
        }
    });
}
function openRename(map, onDone) {
    const dialog = openDialog(`
        <header class="dlg-head dlg-head--simple"><div><h3>Taktikkarte umbenennen</h3></div></header>
        <label class="view-field">
            <span>Name</span>
            <input type="text" id="rn-title" value="${esc(map.title)}" minlength="${LIMITS.title.min}" maxlength="${LIMITS.title.max}" />
        </label>
        <p class="wiz-message" id="rn-message" role="alert"></p>
        <div class="dlg-actions">
            <button type="button" class="wiz-button" id="rn-save">Speichern</button>
            <button type="button" class="wiz-button wiz-button--ghost" data-dialog-close>Abbrechen</button>
        </div>`);
    dialog.querySelector("#rn-save").addEventListener("click", async () => {
        const title = dialog.querySelector("#rn-title").value.trim();
        const text = dialog.querySelector("#rn-message");
        if (title.length < LIMITS.title.min) {
            text.textContent = `Mindestens ${LIMITS.title.min} Zeichen.`;
            return;
        }
        const error = await updateMap(map.id, { title });
        if (error) {
            text.textContent = error;
            return;
        }
        dialog.close();
        onDone();
    });
}
// --------------------------------------------------
// Die vier Bereiche der Holzleiste
// --------------------------------------------------
function shell(map, slot, body, canEdit, editing) {
    return `
        <header class="dlg-head dlg-head--simple">
            <div>
                <h3>${SLOT_TITLES[slot]}</h3>
                <p class="dlg-note">${esc(map.title)}</p>
            </div>
        </header>
        ${body}
        ${canEdit && !editing && slot !== "generals"
        ? `<div class="dlg-actions"><button type="button" class="wiz-button wiz-button--ghost" id="slot-edit">Bearbeiten</button></div>`
        : ""}`;
}
async function openSlot(map, slot, canEdit, userId) {
    if (map.isStatic) {
        openDialog(shell(map, slot, `<p class="view-empty">Zu dieser Karte gibt es noch keine Angaben. Angaben gibt es bei Karten, die über „Neue Taktikkarte hinzufügen“ hochgeladen wurden.</p>`, false, false), "member-dialog--wide");
        return;
    }
    if (slot === "generals") {
        await showGenerals(map, canEdit, userId);
    }
    else if (slot === "units") {
        showUnits(map, canEdit, false);
    }
    else {
        showText(map, slot, canEdit, false);
    }
}
function showText(map, slot, canEdit, editing) {
    const value = map[slot];
    if (!editing) {
        const dialog = openDialog(shell(map, slot, value
            ? `<p class="tactic-text">${esc(value)}</p>`
            : `<p class="view-empty">Hier steht noch nichts.</p>`, canEdit, false), "member-dialog--wide");
        dialog.querySelector("#slot-edit")?.addEventListener("click", () => showText(map, slot, canEdit, true));
        return;
    }
    const dialog = openDialog(shell(map, slot, `<label class="view-field">
                <span>${SLOT_TITLES[slot]}</span>
                <textarea id="slot-text" class="tactic-textarea" maxlength="${LIMITS.text}" rows="10">${esc(value)}</textarea>
            </label>
            <p class="tactic-counter" id="slot-counter"></p>
            <p class="wiz-message" id="slot-message" role="alert"></p>
            <div class="dlg-actions">
                <button type="button" class="wiz-button" id="slot-save">Speichern</button>
                <button type="button" class="wiz-button wiz-button--ghost" id="slot-cancel">Abbrechen</button>
            </div>`, canEdit, true), "member-dialog--wide");
    const area = dialog.querySelector("#slot-text");
    const counter = dialog.querySelector("#slot-counter");
    const text = dialog.querySelector("#slot-message");
    const count = () => {
        counter.textContent = `${area.value.length} / ${LIMITS.text} Zeichen`;
    };
    count();
    area.addEventListener("input", count);
    area.focus();
    dialog.querySelector("#slot-cancel").addEventListener("click", () => showText(map, slot, canEdit, false));
    dialog.querySelector("#slot-save").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const next = area.value.trim();
        button.disabled = true;
        text.textContent = "Wird gespeichert …";
        const error = await updateMap(map.id, { [slot]: next });
        if (error) {
            text.textContent = error;
            button.disabled = false;
            return;
        }
        map[slot] = next;
        showText(map, slot, canEdit, false);
    });
}
function showUnits(map, canEdit, editing) {
    if (!editing) {
        const chips = map.units
            .map((slug) => findBattleUnit(slug))
            .filter((unit) => Boolean(unit));
        const dialog = openDialog(shell(map, "units", chips.length
            ? `<ul class="tactic-chips">${chips
                .map((unit) => `<li><span class="spec-avatar${unit.abbr.length > 2 ? " spec-avatar--long" : ""}">${esc(unit.abbr)}</span>${esc(unit.name)}</li>`)
                .join("")}</ul>`
            : `<p class="view-empty">Hier steht noch nichts.</p>`, canEdit, false), "member-dialog--wide");
        dialog.querySelector("#slot-edit")?.addEventListener("click", () => showUnits(map, canEdit, true));
        return;
    }
    const dialog = openDialog(shell(map, "units", `<p class="dlg-note">Wähle die Einheiten, die für diese Karte gebraucht werden.</p>
            <div class="tactic-unit-grid">
                ${BATTLE_UNITS.map((unit) => `
                    <label class="tactic-unit">
                        <input type="checkbox" value="${unit.slug}"${map.units.includes(unit.slug) ? " checked" : ""} />
                        <span class="spec-avatar${unit.abbr.length > 2 ? " spec-avatar--long" : ""}">${esc(unit.abbr)}</span>
                        <span>${esc(unit.name)}</span>
                    </label>`).join("")}
            </div>
            <p class="wiz-message" id="slot-message" role="alert"></p>
            <div class="dlg-actions">
                <button type="button" class="wiz-button" id="slot-save">Speichern</button>
                <button type="button" class="wiz-button wiz-button--ghost" id="slot-cancel">Abbrechen</button>
            </div>`, canEdit, true), "member-dialog--wide");
    const text = dialog.querySelector("#slot-message");
    dialog.querySelector("#slot-cancel").addEventListener("click", () => showUnits(map, canEdit, false));
    dialog.querySelector("#slot-save").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const units = Array.from(dialog.querySelectorAll(".tactic-unit input:checked")).map((input) => input.value);
        button.disabled = true;
        text.textContent = "Wird gespeichert …";
        const error = await updateMap(map.id, { units });
        if (error) {
            text.textContent = error;
            button.disabled = false;
            return;
        }
        map.units = units;
        showUnits(map, canEdit, false);
    });
}
async function showGenerals(map, canEdit, userId) {
    const dialog = openDialog(shell(map, "generals", `<p class="view-empty">Wird geladen …</p>`, false, false), "member-dialog--wide");
    const [{ generals, error }, builds] = await Promise.all([loadGenerals(map.id), canEdit ? loadBuilds() : Promise.resolve(null)]);
    const linked = new Set(generals.map((item) => item.build.id));
    const options = (builds?.builds ?? []).filter((build) => build.unitType === "general" && !linked.has(build.id));
    const list = generals.length
        ? `<div class="tactic-generals">${generals
            .map((item) => `
                <div class="tactic-general" data-link="${item.id}">
                    ${cardHtml(item.build, userId)}
                    ${item.note ? `<p class="tactic-general__note">${esc(item.note)}</p>` : ""}
                    ${canEdit ? `<button type="button" class="wiz-button wiz-button--danger tactic-general__remove" data-remove="${item.id}">Entfernen</button>` : ""}
                </div>`)
            .join("")}</div>`
        : `<p class="view-empty">${error ? esc(error) : "Hier sind noch keine Generäle verknüpft."}</p>`;
    const form = canEdit
        ? `<div class="tactic-add">
            <h4>General verknüpfen</h4>
            ${options.length
            ? `<label class="view-field">
                        <span>Skillung</span>
                        <select id="gen-build">
                            ${options
                .map((build) => {
                const unit = findUnit(build.unitType, build.unitSlug);
                return `<option value="${build.id}">${esc(unit?.name ?? "General")} – ${esc(build.title || "Standard-Skillung")} (${esc(build.username)})</option>`;
            })
                .join("")}
                        </select>
                    </label>
                    <label class="view-field">
                        <span>Notiz (optional)</span>
                        <input type="text" id="gen-note" maxlength="${LIMITS.note}" placeholder="z. B. kommt in die zweite Welle" />
                    </label>
                    <div class="dlg-actions"><button type="button" class="wiz-button" id="gen-add">Hinzufügen</button></div>`
            : `<p class="dlg-note">Es gibt keine weiteren Skillungen von Generälen. Neue legst du unter „Unsere bevorzugten Skills“ an.</p>`}
            <p class="wiz-message" id="gen-message" role="alert"></p>
        </div>`
        : "";
    dialog.querySelector(".member-dialog__panel").innerHTML = `
        <button type="button" class="member-dialog__close" data-dialog-close aria-label="Fenster schließen">×</button>
        ${shell(map, "generals", list + form, canEdit, true)}`;
    const text = dialog.querySelector("#gen-message");
    dialog.querySelectorAll(".build-card").forEach((card) => {
        const open = () => {
            const build = generals.find((item) => item.build.id === card.dataset.id)?.build;
            if (!build) {
                return;
            }
            const detail = openBuild(build, false, () => undefined);
            detail
                .querySelector(".member-dialog__panel")
                ?.insertAdjacentHTML("afterbegin", `<button type="button" class="wiz-back" data-back>← Zurück zu den Generälen</button>`);
            detail.querySelector("[data-back]")?.addEventListener("click", () => void showGenerals(map, canEdit, userId));
        };
        card.addEventListener("click", open);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                open();
            }
        });
    });
    dialog.querySelectorAll("[data-remove]").forEach((button) => {
        button.addEventListener("click", async () => {
            button.disabled = true;
            const failed = await removeGeneral(button.dataset.remove);
            if (failed) {
                if (text) {
                    text.textContent = failed;
                }
                button.disabled = false;
                return;
            }
            void showGenerals(map, canEdit, userId);
        });
    });
    dialog.querySelector("#gen-add")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const buildId = dialog.querySelector("#gen-build").value;
        const note = dialog.querySelector("#gen-note").value.trim();
        button.disabled = true;
        const failed = await addGeneral(map.id, buildId, note);
        if (failed) {
            text.textContent = failed;
            button.disabled = false;
            return;
        }
        void showGenerals(map, canEdit, userId);
    });
}
//# sourceMappingURL=tactic-view.js.map
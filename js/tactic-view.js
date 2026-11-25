import { MAP_CATEGORIES } from "./data/adventure-maps.js";
import { GENERALS } from "./data/specialists.js";
import { FERNKAMPF } from "./data/fernkampf.js";
import { BATTLE_UNITS, findBattleUnit } from "./data/units.js";
import { esc, openDialog } from "./dom.js";
import { findUnit, getCurrentUser, loadBuilds } from "./skill-builds.js";
import { cardHtml, openBuild } from "./skill-builds-view.js";
import { mountTacticFrame } from "./tactic-frame.js";
import { LIMITS, addGeneral, cleanCamps, cleanShapes, deleteMap, getMap, isAdmin, loadGenerals, removeGeneral, setStatus, updateMap, } from "./tactic-store.js";
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
        canMark: canEdit,
        onMarkToggle: () => toggleMarking(map),
        onPlaceMark: (x, y) => placeMark(map, x, y),
        onRemoveMark: (key) => removeMark(map, key),
        onMoveMark: (key, x, y) => moveMark(map, key, x, y),
        onRemoveLine: (key) => removeLine(map, key),
    });
    marking = false;
    showShapes(map);
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
        toggleCamps(map, canEdit);
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
let marking = false;
let drawMode = "camp";
let selectedCamp = 0;
let markText = "A";
let pendingPoint = null;
let dirty = false;
let snapshot = "";
function round(value) {
    return Math.round(value * 10000) / 10000;
}
function flattenMarks(map) {
    const camps = map.camps.flatMap((camp, ci) => camp.marks.map((mark, mi) => ({ key: `c:${ci}:${mi}`, kind: "camp", nr: camp.nr, x: mark.x, y: mark.y })));
    const pins = map.shapes.pins.map((pin, i) => ({ key: `p:${i}`, kind: "pin", nr: pin.t, x: pin.x, y: pin.y }));
    return [...camps, ...pins];
}
function flattenLines(map) {
    return map.shapes.lines.map((line, i) => ({ key: `l:${i}`, ...line }));
}
function showShapes(map) {
    frame?.setMarks(flattenMarks(map));
    frame?.setLines(flattenLines(map));
}
function refreshMarks(map) {
    showShapes(map);
    const panelBody = document.querySelector(".tactic__panel-body");
    if (marking && panelBody && frame?.panelId() === "mark") {
        renderMarkPanel(panelBody, map);
    }
}
function setMarkMessage(text) {
    const element = document.querySelector("#mark-message");
    if (element) {
        element.textContent = text;
    }
}
function nextPinText(map) {
    const used = map.shapes.pins.map((pin) => /^P(\d+)$/.exec(pin.t)).filter((hit) => Boolean(hit));
    const highest = Math.max(0, ...used.map((hit) => Number(hit[1])));
    return `P${highest + 1}`;
}
function placeMark(map, x, y) {
    const point = { x: round(x), y: round(y) };
    if (drawMode === "camp") {
        const camp = map.camps[selectedCamp];
        if (!camp) {
            setMarkMessage("Lege zuerst ein Lager an.");
            return;
        }
        if (camp.marks.length >= LIMITS.marks) {
            setMarkMessage(`Pro Lager höchstens ${LIMITS.marks} Markierungen.`);
            return;
        }
        camp.marks.push(point);
    }
    else if (drawMode === "line") {
        if (!pendingPoint) {
            pendingPoint = point;
            frame?.setPending(point);
            setMarkMessage("Jetzt den Endpunkt der Linie anklicken.");
            return;
        }
        if (map.shapes.lines.length >= LIMITS.lines) {
            setMarkMessage(`Höchstens ${LIMITS.lines} Linien.`);
            return;
        }
        map.shapes.lines.push({ x1: pendingPoint.x, y1: pendingPoint.y, x2: point.x, y2: point.y });
        pendingPoint = null;
        frame?.setPending(null);
    }
    else {
        if (map.shapes.pins.length >= LIMITS.pins) {
            setMarkMessage(`Höchstens ${LIMITS.pins} Positionen und Beschriftungen.`);
            return;
        }
        const t = drawMode === "pin" ? nextPinText(map) : markText.trim().slice(0, LIMITS.pinText);
        if (!t) {
            setMarkMessage("Gib zuerst einen Text ein, zum Beispiel A oder FK.");
            return;
        }
        map.shapes.pins.push({ t, ...point });
    }
    dirty = true;
    refreshMarks(map);
}
function removeMark(map, key) {
    const [kind, first, second] = key.split(":");
    if (kind === "c") {
        map.camps[Number(first)]?.marks.splice(Number(second), 1);
    }
    else {
        map.shapes.pins.splice(Number(first), 1);
    }
    dirty = true;
    refreshMarks(map);
}
function moveMark(map, key, x, y) {
    const [kind, first, second] = key.split(":");
    const target = kind === "c" ? map.camps[Number(first)]?.marks[Number(second)] : map.shapes.pins[Number(first)];
    if (target) {
        target.x = round(x);
        target.y = round(y);
        dirty = true;
        refreshMarks(map);
    }
}
function removeLine(map, key) {
    map.shapes.lines.splice(Number(key.split(":")[1]), 1);
    dirty = true;
    refreshMarks(map);
}
function stopMarking(map, discard) {
    if (discard && dirty) {
        const saved = JSON.parse(snapshot);
        map.camps = cleanCamps(saved.camps);
        map.shapes = cleanShapes(saved.shapes);
    }
    marking = false;
    dirty = false;
    pendingPoint = null;
    frame?.setPending(null);
    frame?.setMarking(false);
    showShapes(map);
}
function toggleMarking(map) {
    if (!frame) {
        return;
    }
    if (marking) {
        frame.closePanel();
        return;
    }
    marking = true;
    dirty = false;
    drawMode = "camp";
    selectedCamp = 0;
    pendingPoint = null;
    snapshot = JSON.stringify({ camps: map.camps, shapes: map.shapes });
    frame.setMarking(true, false);
    const body = frame.openPanel("mark", "Auf der Karte markieren", {
        beforeClose: () => !dirty || window.confirm("Nicht gespeicherte Markierungen verwerfen?"),
        onClose: () => {
            if (marking) {
                stopMarking(map, true);
            }
        },
    });
    renderMarkPanel(body, map);
}
const MODE_LABELS = {
    camp: "Lager",
    pin: "Position P",
    text: "Text",
    line: "Linie",
};
const MODE_HELP = {
    camp: "Lager wählen, dann auf die Karte klicken.",
    pin: "Klicken setzt P1, P2, … für die Stellen, an denen Generäle stehen sollen.",
    text: "Text eingeben (zum Beispiel A oder FK) und auf die Karte klicken.",
    line: "Anfang und Ende anklicken. Eine Linie anklicken entfernt sie.",
};
function renderMarkPanel(body, map) {
    const camps = drawMode === "camp"
        ? `<div class="mark-list">${map.camps.length
            ? map.camps
                .map((camp, i) => `<button type="button" class="mark-camp${i === selectedCamp ? " is-selected" : ""}" data-i="${i}" aria-pressed="${i === selectedCamp}"><b>${esc(camp.nr)}</b><span>${esc(camp.general) || "–"}</span><small>${camp.marks.length}×</small></button>`)
                .join("")
            : `<p class="camp-empty">Lege zuerst ein Lager an.</p>`}</div>`
        : drawMode === "text"
            ? `<label class="mark-text">Text <input type="text" id="mark-text" maxlength="${LIMITS.pinText}" value="${esc(markText)}" /></label>`
            : "";
    body.innerHTML = `
        <div class="mark-modes" role="group" aria-label="Was setzen?">
            ${Object.keys(MODE_LABELS)
        .map((mode) => `<button type="button" class="mark-mode${mode === drawMode ? " is-selected" : ""}" data-mode="${mode}" aria-pressed="${mode === drawMode}">${MODE_LABELS[mode]}</button>`)
        .join("")}
        </div>
        <p class="mark-help">${MODE_HELP[drawMode]} Markierung anklicken entfernt sie, ziehen verschiebt sie.</p>
        ${camps}
        <div class="mark-actions">
            ${drawMode === "camp" ? `<button type="button" class="camp-edit" data-mark-add>+ Lager</button>` : ""}
            <button type="button" class="camp-edit" data-mark-save>Speichern</button>
            <button type="button" class="camp-edit" data-mark-done>Beenden</button>
        </div>
        <p class="camp-legend" id="mark-message" role="status">${dirty ? "Nicht gespeichert." : ""}</p>`;
    body.querySelectorAll(".mark-mode").forEach((button) => {
        button.addEventListener("click", () => {
            drawMode = button.dataset.mode;
            pendingPoint = null;
            frame?.setPending(null);
            frame?.setMarking(true, drawMode === "line");
            renderMarkPanel(body, map);
        });
    });
    body.querySelectorAll(".mark-camp").forEach((button) => {
        button.addEventListener("click", () => {
            selectedCamp = Number(button.dataset.i);
            renderMarkPanel(body, map);
        });
    });
    body.querySelector("#mark-text")?.addEventListener("input", (event) => {
        markText = event.target.value;
    });
    body.querySelector("[data-mark-add]")?.addEventListener("click", () => {
        if (map.camps.length >= LIMITS.camps) {
            setMarkMessage(`Höchstens ${LIMITS.camps} Lager pro Karte.`);
            return;
        }
        const highest = Math.max(0, ...map.camps.map((camp) => parseInt(camp.nr, 10) || 0));
        map.camps.push({ nr: String(highest + 1), general: "", losses: "", units: [], fk: [], marks: [] });
        selectedCamp = map.camps.length - 1;
        dirty = true;
        renderMarkPanel(body, map);
    });
    body.querySelector("[data-mark-save]").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const camps = cleanCamps(map.camps);
        const shapes = cleanShapes(map.shapes);
        button.disabled = true;
        setMarkMessage("Wird gespeichert …");
        const error = await updateMap(map.id, { camps, shapes });
        button.disabled = false;
        if (error) {
            setMarkMessage(error);
            return;
        }
        map.camps = camps;
        map.shapes = shapes;
        snapshot = JSON.stringify({ camps, shapes });
        dirty = false;
        refreshMarks(map);
        setMarkMessage("Gespeichert.");
    });
    body.querySelector("[data-mark-done]").addEventListener("click", () => frame?.closePanel());
}
function toggleCamps(map, canEdit) {
    if (!frame) {
        return;
    }
    if (frame.panelId() === "units") {
        frame.closePanel();
        return;
    }
    if (marking && frame.panelId() === "mark") {
        if (dirty && !window.confirm("Nicht gespeicherte Markierungen verwerfen?")) {
            return;
        }
    }
    renderCamps(frame.openPanel("units", "Einheiten pro Lager"), map, canEdit);
}
function renderCamps(body, map, canEdit) {
    const used = new Map();
    const rows = map.camps
        .map((camp) => {
        const units = camp.units
            .map((entry) => {
            const unit = findBattleUnit(entry.unit);
            if (!unit) {
                return "";
            }
            used.set(unit.abbr, unit.name);
            return `<span class="camp-unit" title="${esc(unit.name)}">${entry.count}&nbsp;${esc(unit.abbr)}</span>`;
        })
            .join(" ");
        const fk = camp.fk
            .map((entry) => {
            used.set("FK", "Fernkampf");
            return `<span class="camp-unit camp-unit--fk" title="Fernkampf">FK&nbsp;${entry.count}×&nbsp;${esc(entry.name)}</span>`;
        })
            .join(" ");
        return `<tr><th scope="row">${esc(camp.nr)}.</th><td>${esc(camp.general) || "–"}</td><td>${[units, fk].filter(Boolean).join(" ") || "–"}</td><td class="camp-losses">${esc(camp.losses) || "–"}</td></tr>`;
    })
        .join("");
    const legend = [...used.entries()].map(([abbr, name]) => `${esc(abbr)} = ${esc(name)}`).join(" · ");
    body.innerHTML = `
        ${rows
        ? `<div class="camp-scroll" tabindex="0" aria-label="Tabelle der Lager">
                    <table class="camp-table">
                        <thead><tr><th scope="col">Lager</th><th scope="col">General</th><th scope="col">Einheiten</th><th scope="col" class="camp-losses">Verluste</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <p class="camp-legend">${legend}</p>`
        : `<p class="camp-empty">Für diese Karte sind noch keine Lager eingetragen.</p>`}
        ${canEdit ? `<button type="button" class="camp-edit" data-camp-edit>Lager bearbeiten</button>` : ""}`;
    body.querySelector("[data-camp-edit]")?.addEventListener("click", () => openCampEditor(map, () => {
        showShapes(map);
        if (frame?.panelId() === "units") {
            renderCamps(frame.openPanel("units", "Einheiten pro Lager"), map, canEdit);
        }
    }));
}
function openCampEditor(map, onSaved) {
    let draft = map.camps.map((camp) => ({ ...camp, units: camp.units.map((entry) => ({ ...entry })) }));
    const dialog = openDialog(`
        <header class="dlg-head dlg-head--simple">
            <div>
                <h3>Einheiten pro Lager</h3>
                <p class="dlg-note">${esc(map.title)}: Nummer des Lagers, Kürzel des Generals und die Einheiten mit Stückzahl.</p>
            </div>
        </header>

        <div id="camp-edit"></div>

        <datalist id="fk-options">
            ${FERNKAMPF.map((item) => `<option value="${esc(item.name)}" label="${esc(item.effect)}"></option>`).join("")}
        </datalist>

        <datalist id="camp-generals">
            ${GENERALS.filter((general) => general.abbr)
        .map((general) => `<option value="${esc(general.abbr)}">${esc(general.name)}</option>`)
        .join("")}
        </datalist>

        <p class="wiz-message" id="camp-message" role="alert"></p>

        <div class="dlg-actions">
            <button type="button" class="wiz-button" id="camp-save">Speichern</button>
            <button type="button" class="wiz-button wiz-button--ghost" id="camp-add">Lager hinzufügen</button>
            <button type="button" class="wiz-button wiz-button--ghost" data-dialog-close>Abbrechen</button>
        </div>`, "member-dialog--wide");
    const host = dialog.querySelector("#camp-edit");
    const text = dialog.querySelector("#camp-message");
    function unitOptions(selected) {
        return BATTLE_UNITS.map((unit) => `<option value="${unit.slug}"${unit.slug === selected ? " selected" : ""}>${esc(unit.abbr)} – ${esc(unit.name)}</option>`).join("");
    }
    function draw() {
        host.innerHTML = draft.length
            ? draft
                .map((camp, i) => `
            <fieldset class="camp-row" data-i="${i}">
                <div class="camp-row__top">
                    <label class="view-field"><span>Lager</span>
                        <input type="text" data-f="nr" maxlength="${LIMITS.campNr}" value="${esc(camp.nr)}" inputmode="numeric" /></label>
                    <label class="view-field"><span>General</span>
                        <input type="text" data-f="general" list="camp-generals" maxlength="${LIMITS.campGeneral}" value="${esc(camp.general)}" /></label>
                    <label class="view-field"><span>Verluste</span>
                        <input type="text" data-f="losses" maxlength="${LIMITS.campLosses}" value="${esc(camp.losses)}" placeholder="z. B. 12 BSS" /></label>
                    <button type="button" class="wiz-button wiz-button--danger" data-act="rm-camp">Lager entfernen</button>
                </div>
                <div class="camp-row__units">
                    ${camp.units
                .map((entry, j) => `
                    <div class="camp-line" data-j="${j}">
                        <input type="number" data-f="count" min="1" max="${LIMITS.unitCount}" value="${entry.count}" aria-label="Stückzahl" />
                        <select data-f="unit" aria-label="Einheit">${unitOptions(entry.unit)}</select>
                        <button type="button" data-act="rm-unit" aria-label="Einheit entfernen">×</button>
                    </div>`)
                .join("")}
                    ${camp.fk
                .map((entry, k) => `
                    <div class="camp-line camp-line--fk" data-k="${k}">
                        <input type="number" data-f="fk-count" min="1" max="${LIMITS.fkCount}" value="${entry.count}" aria-label="Anzahl" />
                        <input type="text" data-f="fk-name" list="fk-options" maxlength="${LIMITS.fkName}" value="${esc(entry.name)}" placeholder="Fernkampf, z. B. Brandpfeil" aria-label="Fernkampf" />
                        <button type="button" data-act="rm-fk" aria-label="Fernkampf entfernen">×</button>
                    </div>`)
                .join("")}
                    <div class="camp-row__add">
                        ${camp.units.length < LIMITS.campUnits
                ? `<button type="button" class="wiz-button wiz-button--ghost" data-act="add-unit">+ Einheit</button>`
                : ""}
                        ${camp.fk.length < LIMITS.campFk
                ? `<button type="button" class="wiz-button wiz-button--ghost" data-act="add-fk">+ Fernkampf</button>`
                : ""}
                    </div>
                </div>
            </fieldset>`)
                .join("")
            : `<p class="view-empty">Noch keine Lager. Füge das erste hinzu.</p>`;
    }
    draw();
    host.addEventListener("input", (event) => {
        const field = event.target;
        const row = field.closest(".camp-row");
        const name = field.dataset.f;
        if (!row || !name) {
            return;
        }
        const camp = draft[Number(row.dataset.i)];
        if (name === "nr" || name === "general" || name === "losses") {
            camp[name] = field.value;
            return;
        }
        if (name === "fk-count" || name === "fk-name") {
            const fkEntry = camp.fk[Number(field.closest(".camp-line").dataset.k)];
            if (name === "fk-count") {
                fkEntry.count = Number(field.value);
            }
            else {
                fkEntry.name = field.value;
            }
            return;
        }
        const entry = camp.units[Number(field.closest(".camp-line").dataset.j)];
        if (name === "count") {
            entry.count = Number(field.value);
        }
        else {
            entry.unit = field.value;
        }
    });
    host.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-act]");
        const row = button?.closest(".camp-row");
        if (!button || !row) {
            return;
        }
        const camp = draft[Number(row.dataset.i)];
        if (button.dataset.act === "rm-camp") {
            draft.splice(Number(row.dataset.i), 1);
        }
        else if (button.dataset.act === "add-fk") {
            camp.fk.push({ name: "", count: 1 });
        }
        else if (button.dataset.act === "rm-fk") {
            camp.fk.splice(Number(button.closest(".camp-line").dataset.k), 1);
        }
        else if (button.dataset.act === "add-unit") {
            camp.units.push({ unit: camp.units[camp.units.length - 1]?.unit ?? BATTLE_UNITS[0].slug, count: 50 });
        }
        else {
            camp.units.splice(Number(button.closest(".camp-line").dataset.j), 1);
        }
        draw();
    });
    dialog.querySelector("#camp-add").addEventListener("click", () => {
        if (draft.length >= LIMITS.camps) {
            text.textContent = `Höchstens ${LIMITS.camps} Lager pro Karte.`;
            return;
        }
        draft.push({ nr: String(draft.length + 1), general: "", losses: "", units: [], fk: [], marks: [] });
        draw();
        host.lastElementChild?.scrollIntoView({ block: "nearest" });
    });
    dialog.querySelector("#camp-save").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const camps = cleanCamps(draft);
        button.disabled = true;
        text.textContent = "Wird gespeichert …";
        const error = await updateMap(map.id, { camps });
        if (error) {
            text.textContent = error;
            button.disabled = false;
            return;
        }
        map.camps = camps;
        dialog.close();
        onSaved();
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
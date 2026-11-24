import { MAP_CATEGORIES } from "./data/adventure-maps.js";
import type { SlotId } from "./data/tactic-frame.js";
import { GENERALS } from "./data/specialists.js";
import { BATTLE_UNITS, findBattleUnit } from "./data/units.js";
import { esc, openDialog } from "./dom.js";
import { findUnit, getCurrentUser, loadBuilds } from "./skill-builds.js";
import { cardHtml, openBuild } from "./skill-builds-view.js";
import { mountTacticFrame } from "./tactic-frame.js";
import type { MapMark, TacticFrame } from "./tactic-frame.js";
import {
    LIMITS,
    addGeneral,
    cleanCamps,
    deleteMap,
    getMap,
    isAdmin,
    loadGenerals,
    removeGeneral,
    setStatus,
    updateMap,
} from "./tactic-store.js";
import type { Camp, TacticMap } from "./tactic-store.js";

export const TACTIC_HASH = "taktikkarte-";

let frame: TacticFrame | null = null;
let token = 0;

export function leaveTactic(): void {
    token += 1;
    frame?.destroy();
    frame = null;
}

function formatDate(iso: string): string {
    return iso ? new Date(iso).toLocaleDateString("de-DE") : "";
}

const SLOT_TITLES: Record<SlotId, string> = {
    generals: "Generäle",
    units: "Einheiten",
    specials: "Besonderheiten",
    tips: "Tipps",
};

export async function renderTacticView(root: HTMLElement, id: string): Promise<void> {
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

    const message = root.querySelector<HTMLElement>("#tactic-message")!;
    const actions = root.querySelector<HTMLElement>("#tactic-actions")!;

    frame = mountTacticFrame(root.querySelector<HTMLElement>("#tactic-host")!, {
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
    });

    marking = false;
    frame.setMarks(flattenMarks(map));

    const buttons: string[] = [];

    if (admin && !map.isStatic) {
        buttons.push(
            map.status === "pending"
                ? `<button type="button" class="wiz-button" data-act="approve">Freigeben</button>`
                : `<button type="button" class="wiz-button wiz-button--ghost" data-act="unapprove">Zurück in die Freigabe</button>`
        );
    }

    if (canEdit) {
        buttons.push(`<button type="button" class="wiz-button wiz-button--ghost" data-act="rename">Umbenennen</button>`);
        buttons.push(`<button type="button" class="wiz-button wiz-button--danger" data-act="delete">Karte löschen</button>`);
    }

    actions.innerHTML = buttons.join("");

    actions.addEventListener("click", async (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-act]");

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

function openRename(map: TacticMap, onDone: () => void): void {
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

    dialog.querySelector("#rn-save")!.addEventListener("click", async () => {
        const title = dialog.querySelector<HTMLInputElement>("#rn-title")!.value.trim();
        const text = dialog.querySelector<HTMLElement>("#rn-message")!;

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

function shell(map: TacticMap, slot: SlotId, body: string, canEdit: boolean, editing: boolean): string {
    return `
        <header class="dlg-head dlg-head--simple">
            <div>
                <h3>${SLOT_TITLES[slot]}</h3>
                <p class="dlg-note">${esc(map.title)}</p>
            </div>
        </header>
        ${body}
        ${
            canEdit && !editing && slot !== "generals"
                ? `<div class="dlg-actions"><button type="button" class="wiz-button wiz-button--ghost" id="slot-edit">Bearbeiten</button></div>`
                : ""
        }`;
}

async function openSlot(map: TacticMap, slot: SlotId, canEdit: boolean, userId: string): Promise<void> {
    if (map.isStatic) {
        openDialog(
            shell(map, slot, `<p class="view-empty">Zu dieser Karte gibt es noch keine Angaben. Angaben gibt es bei Karten, die über „Neue Taktikkarte hinzufügen“ hochgeladen wurden.</p>`, false, false),
            "member-dialog--wide"
        );
        return;
    }

    if (slot === "generals") {
        await showGenerals(map, canEdit, userId);
    } else if (slot === "units") {
        toggleCamps(map, canEdit);
    } else {
        showText(map, slot, canEdit, false);
    }
}

function showText(map: TacticMap, slot: "specials" | "tips", canEdit: boolean, editing: boolean): void {
    const value = map[slot];

    if (!editing) {
        const dialog = openDialog(
            shell(
                map,
                slot,
                value
                    ? `<p class="tactic-text">${esc(value)}</p>`
                    : `<p class="view-empty">Hier steht noch nichts.</p>`,
                canEdit,
                false
            ),
            "member-dialog--wide"
        );

        dialog.querySelector("#slot-edit")?.addEventListener("click", () => showText(map, slot, canEdit, true));
        return;
    }

    const dialog = openDialog(
        shell(
            map,
            slot,
            `<label class="view-field">
                <span>${SLOT_TITLES[slot]}</span>
                <textarea id="slot-text" class="tactic-textarea" maxlength="${LIMITS.text}" rows="10">${esc(value)}</textarea>
            </label>
            <p class="tactic-counter" id="slot-counter"></p>
            <p class="wiz-message" id="slot-message" role="alert"></p>
            <div class="dlg-actions">
                <button type="button" class="wiz-button" id="slot-save">Speichern</button>
                <button type="button" class="wiz-button wiz-button--ghost" id="slot-cancel">Abbrechen</button>
            </div>`,
            canEdit,
            true
        ),
        "member-dialog--wide"
    );

    const area = dialog.querySelector<HTMLTextAreaElement>("#slot-text")!;
    const counter = dialog.querySelector<HTMLElement>("#slot-counter")!;
    const text = dialog.querySelector<HTMLElement>("#slot-message")!;

    const count = (): void => {
        counter.textContent = `${area.value.length} / ${LIMITS.text} Zeichen`;
    };

    count();
    area.addEventListener("input", count);
    area.focus();

    dialog.querySelector("#slot-cancel")!.addEventListener("click", () => showText(map, slot, canEdit, false));

    dialog.querySelector<HTMLButtonElement>("#slot-save")!.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
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

// --------------------------------------------------
// Lager direkt auf der Karte markieren
// --------------------------------------------------

let marking = false;
let selectedCamp = 0;
let dirty = false;
let snapshot = "";

function flattenMarks(map: TacticMap): MapMark[] {
    return map.camps.flatMap((camp, ci) => camp.marks.map((mark, mi) => ({ key: `${ci}:${mi}`, nr: camp.nr, x: mark.x, y: mark.y })));
}

function refreshMarks(map: TacticMap): void {
    frame?.setMarks(flattenMarks(map));

    const panelBody = document.querySelector<HTMLElement>(".tactic__panel-body");

    if (marking && panelBody && frame?.panelId() === "mark") {
        renderMarkPanel(panelBody, map);
    }
}

function placeMark(map: TacticMap, x: number, y: number): void {
    const camp = map.camps[selectedCamp];

    if (!camp) {
        setMarkMessage("Lege zuerst ein Lager an.");
        return;
    }

    if (camp.marks.length >= LIMITS.marks) {
        setMarkMessage(`Pro Lager höchstens ${LIMITS.marks} Markierungen.`);
        return;
    }

    camp.marks.push({ x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 });
    dirty = true;
    refreshMarks(map);
}

function removeMark(map: TacticMap, key: string): void {
    const [ci, mi] = key.split(":").map(Number);

    map.camps[ci]?.marks.splice(mi, 1);
    dirty = true;
    refreshMarks(map);
}

function moveMark(map: TacticMap, key: string, x: number, y: number): void {
    const [ci, mi] = key.split(":").map(Number);
    const mark = map.camps[ci]?.marks[mi];

    if (mark) {
        mark.x = Math.round(x * 10000) / 10000;
        mark.y = Math.round(y * 10000) / 10000;
        dirty = true;
        refreshMarks(map);
    }
}

function setMarkMessage(text: string): void {
    const element = document.querySelector<HTMLElement>("#mark-message");

    if (element) {
        element.textContent = text;
    }
}

function stopMarking(map: TacticMap, discard: boolean): void {
    if (discard && dirty) {
        map.camps = cleanCamps(JSON.parse(snapshot));
    }

    marking = false;
    dirty = false;
    frame?.setMarking(false);
    frame?.setMarks(flattenMarks(map));
}

function toggleMarking(map: TacticMap): void {
    if (!frame) {
        return;
    }

    if (marking) {
        frame.closePanel();
        return;
    }

    marking = true;
    dirty = false;
    selectedCamp = 0;
    snapshot = JSON.stringify(map.camps);
    frame.setMarking(true);

    const body = frame.openPanel("mark", "Lager markieren", {
        beforeClose: () => !dirty || window.confirm("Nicht gespeicherte Markierungen verwerfen?"),
        onClose: () => {
            if (marking) {
                stopMarking(map, true);
            }
        },
    });

    renderMarkPanel(body, map);
}

function renderMarkPanel(body: HTMLElement, map: TacticMap): void {
    body.innerHTML = `
        <p class="mark-help">Lager wählen, dann auf die Karte klicken. Markierung anklicken entfernt sie, ziehen verschiebt sie.</p>
        <div class="mark-list">
            ${
                map.camps.length
                    ? map.camps
                          .map(
                              (camp, i) =>
                                  `<button type="button" class="mark-camp${i === selectedCamp ? " is-selected" : ""}" data-i="${i}" aria-pressed="${i === selectedCamp}"><b>${esc(camp.nr)}</b><span>${esc(camp.general) || "–"}</span><small>${camp.marks.length}×</small></button>`
                          )
                          .join("")
                    : `<p class="camp-empty">Lege zuerst ein Lager an.</p>`
            }
        </div>
        <div class="mark-actions">
            <button type="button" class="camp-edit" data-mark-add>+ Lager</button>
            <button type="button" class="camp-edit" data-mark-save>Speichern</button>
            <button type="button" class="camp-edit" data-mark-done>Beenden</button>
        </div>
        <p class="camp-legend" id="mark-message" role="status">${dirty ? "Nicht gespeichert." : ""}</p>`;

    body.querySelectorAll<HTMLButtonElement>(".mark-camp").forEach((button) => {
        button.addEventListener("click", () => {
            selectedCamp = Number(button.dataset.i);
            renderMarkPanel(body, map);
        });
    });

    body.querySelector("[data-mark-add]")!.addEventListener("click", () => {
        if (map.camps.length >= LIMITS.camps) {
            setMarkMessage(`Höchstens ${LIMITS.camps} Lager pro Karte.`);
            return;
        }

        const highest = Math.max(0, ...map.camps.map((camp) => parseInt(camp.nr, 10) || 0));

        map.camps.push({ nr: String(highest + 1), general: "", units: [], marks: [] });
        selectedCamp = map.camps.length - 1;
        dirty = true;
        renderMarkPanel(body, map);
    });

    body.querySelector<HTMLButtonElement>("[data-mark-save]")!.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const camps = cleanCamps(map.camps);

        button.disabled = true;
        setMarkMessage("Wird gespeichert …");

        const error = await updateMap(map.id, { camps });

        button.disabled = false;

        if (error) {
            setMarkMessage(error);
            return;
        }

        map.camps = camps;
        snapshot = JSON.stringify(camps);
        dirty = false;
        refreshMarks(map);
        setMarkMessage("Gespeichert.");
    });

    body.querySelector("[data-mark-done]")!.addEventListener("click", () => frame?.closePanel());
}

function toggleCamps(map: TacticMap, canEdit: boolean): void {
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

function renderCamps(body: HTMLElement, map: TacticMap, canEdit: boolean): void {
    const used = new Map<string, string>();

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

            return `<tr><th scope="row">${esc(camp.nr)}.</th><td>${esc(camp.general) || "–"}</td><td>${units || "–"}</td></tr>`;
        })
        .join("");

    const legend = [...used.entries()].map(([abbr, name]) => `${esc(abbr)} = ${esc(name)}`).join(" · ");

    body.innerHTML = `
        ${
            rows
                ? `<div class="camp-scroll" tabindex="0" aria-label="Tabelle der Lager">
                    <table class="camp-table">
                        <thead><tr><th scope="col">Lager</th><th scope="col">General</th><th scope="col">Einheiten</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <p class="camp-legend">${legend}</p>`
                : `<p class="camp-empty">Für diese Karte sind noch keine Lager eingetragen.</p>`
        }
        ${canEdit ? `<button type="button" class="camp-edit" data-camp-edit>Lager bearbeiten</button>` : ""}`;

    body.querySelector("[data-camp-edit]")?.addEventListener("click", () =>
        openCampEditor(map, () => {
            frame?.setMarks(flattenMarks(map));

            if (frame?.panelId() === "units") {
                renderCamps(frame.openPanel("units", "Einheiten pro Lager"), map, canEdit);
            }
        })
    );
}

function openCampEditor(map: TacticMap, onSaved: () => void): void {
    let draft: Camp[] = map.camps.map((camp) => ({ ...camp, units: camp.units.map((entry) => ({ ...entry })) }));

    const dialog = openDialog(
        `
        <header class="dlg-head dlg-head--simple">
            <div>
                <h3>Einheiten pro Lager</h3>
                <p class="dlg-note">${esc(map.title)}: Nummer des Lagers, Kürzel des Generals und die Einheiten mit Stückzahl.</p>
            </div>
        </header>

        <div id="camp-edit"></div>

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
        </div>`,
        "member-dialog--wide"
    );

    const host = dialog.querySelector<HTMLElement>("#camp-edit")!;
    const text = dialog.querySelector<HTMLElement>("#camp-message")!;

    function unitOptions(selected: string): string {
        return BATTLE_UNITS.map(
            (unit) => `<option value="${unit.slug}"${unit.slug === selected ? " selected" : ""}>${esc(unit.abbr)} – ${esc(unit.name)}</option>`
        ).join("");
    }

    function draw(): void {
        host.innerHTML = draft.length
            ? draft
                  .map(
                      (camp, i) => `
            <fieldset class="camp-row" data-i="${i}">
                <div class="camp-row__top">
                    <label class="view-field"><span>Lager</span>
                        <input type="text" data-f="nr" maxlength="${LIMITS.campNr}" value="${esc(camp.nr)}" inputmode="numeric" /></label>
                    <label class="view-field"><span>General</span>
                        <input type="text" data-f="general" list="camp-generals" maxlength="${LIMITS.campGeneral}" value="${esc(camp.general)}" /></label>
                    <button type="button" class="wiz-button wiz-button--danger" data-act="rm-camp">Lager entfernen</button>
                </div>
                <div class="camp-row__units">
                    ${camp.units
                        .map(
                            (entry, j) => `
                    <div class="camp-line" data-j="${j}">
                        <input type="number" data-f="count" min="1" max="${LIMITS.unitCount}" value="${entry.count}" aria-label="Stückzahl" />
                        <select data-f="unit" aria-label="Einheit">${unitOptions(entry.unit)}</select>
                        <button type="button" data-act="rm-unit" aria-label="Einheit entfernen">×</button>
                    </div>`
                        )
                        .join("")}
                    ${
                        camp.units.length < LIMITS.campUnits
                            ? `<button type="button" class="wiz-button wiz-button--ghost" data-act="add-unit">+ Einheit</button>`
                            : ""
                    }
                </div>
            </fieldset>`
                  )
                  .join("")
            : `<p class="view-empty">Noch keine Lager. Füge das erste hinzu.</p>`;
    }

    draw();

    host.addEventListener("input", (event) => {
        const field = event.target as HTMLInputElement | HTMLSelectElement;
        const row = field.closest<HTMLElement>(".camp-row");
        const name = field.dataset.f;

        if (!row || !name) {
            return;
        }

        const camp = draft[Number(row.dataset.i)];

        if (name === "nr" || name === "general") {
            camp[name] = field.value;
            return;
        }

        const entry = camp.units[Number(field.closest<HTMLElement>(".camp-line")!.dataset.j)];

        if (name === "count") {
            entry.count = Number(field.value);
        } else {
            entry.unit = field.value;
        }
    });

    host.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-act]");
        const row = button?.closest<HTMLElement>(".camp-row");

        if (!button || !row) {
            return;
        }

        const camp = draft[Number(row.dataset.i)];

        if (button.dataset.act === "rm-camp") {
            draft.splice(Number(row.dataset.i), 1);
        } else if (button.dataset.act === "add-unit") {
            camp.units.push({ unit: camp.units[camp.units.length - 1]?.unit ?? BATTLE_UNITS[0].slug, count: 50 });
        } else {
            camp.units.splice(Number(button.closest<HTMLElement>(".camp-line")!.dataset.j), 1);
        }

        draw();
    });

    dialog.querySelector("#camp-add")!.addEventListener("click", () => {
        if (draft.length >= LIMITS.camps) {
            text.textContent = `Höchstens ${LIMITS.camps} Lager pro Karte.`;
            return;
        }

        draft.push({ nr: String(draft.length + 1), general: "", units: [], marks: [] });
        draw();
        host.lastElementChild?.scrollIntoView({ block: "nearest" });
    });

    dialog.querySelector<HTMLButtonElement>("#camp-save")!.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
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

async function showGenerals(map: TacticMap, canEdit: boolean, userId: string): Promise<void> {
    const dialog = openDialog(shell(map, "generals", `<p class="view-empty">Wird geladen …</p>`, false, false), "member-dialog--wide");

    const [{ generals, error }, builds] = await Promise.all([loadGenerals(map.id), canEdit ? loadBuilds() : Promise.resolve(null)]);

    const linked = new Set(generals.map((item) => item.build.id));
    const options = (builds?.builds ?? []).filter((build) => build.unitType === "general" && !linked.has(build.id));

    const list = generals.length
        ? `<div class="tactic-generals">${generals
              .map(
                  (item) => `
                <div class="tactic-general" data-link="${item.id}">
                    ${cardHtml(item.build, userId)}
                    ${item.note ? `<p class="tactic-general__note">${esc(item.note)}</p>` : ""}
                    ${canEdit ? `<button type="button" class="wiz-button wiz-button--danger tactic-general__remove" data-remove="${item.id}">Entfernen</button>` : ""}
                </div>`
              )
              .join("")}</div>`
        : `<p class="view-empty">${error ? esc(error) : "Hier sind noch keine Generäle verknüpft."}</p>`;

    const form = canEdit
        ? `<div class="tactic-add">
            <h4>General verknüpfen</h4>
            ${
                options.length
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
                    : `<p class="dlg-note">Es gibt keine weiteren Skillungen von Generälen. Neue legst du unter „Unsere bevorzugten Skills“ an.</p>`
            }
            <p class="wiz-message" id="gen-message" role="alert"></p>
        </div>`
        : "";

    dialog.querySelector(".member-dialog__panel")!.innerHTML = `
        <button type="button" class="member-dialog__close" data-dialog-close aria-label="Fenster schließen">×</button>
        ${shell(map, "generals", list + form, canEdit, true)}`;

    const text = dialog.querySelector<HTMLElement>("#gen-message");

    dialog.querySelectorAll<HTMLElement>(".build-card").forEach((card) => {
        const open = (): void => {
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

    dialog.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((button) => {
        button.addEventListener("click", async () => {
            button.disabled = true;

            const failed = await removeGeneral(button.dataset.remove!);

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

    dialog.querySelector<HTMLButtonElement>("#gen-add")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const buildId = dialog.querySelector<HTMLSelectElement>("#gen-build")!.value;
        const note = dialog.querySelector<HTMLInputElement>("#gen-note")!.value.trim();

        button.disabled = true;

        const failed = await addGeneral(map.id, buildId, note);

        if (failed) {
            text!.textContent = failed;
            button.disabled = false;
            return;
        }

        void showGenerals(map, canEdit, userId);
    });
}

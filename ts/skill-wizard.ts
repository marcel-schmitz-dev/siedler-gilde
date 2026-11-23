import { esc, openDialog } from "./dom.js";
import { emptyLevels, canSetLevel, SKILL_TREES, UNIT_TYPE_LABEL } from "./data/skill-trees.js";
import type { SkillUnitType } from "./data/skill-trees.js";
import { getCurrentUser, loadBuilds, saveBuild, unitsOf } from "./skill-builds.js";
import type { CurrentUser, SkillBuild, UnitInfo } from "./skill-builds.js";
import { pointsHtml, treeHtml } from "./skill-tree-ui.js";

// ==================================================
// "NEUEN SKILL HINZUFÜGEN" – 3 Schritte in einem Fenster
// 1. General / Entdecker / Geologe  2. Spezialist wählen  3. skillen + speichern
// ==================================================

const TYPE_ICON: Record<SkillUnitType, string> = {
    general: "i-helmet",
    explorer: "i-compass",
    geologist: "i-tools",
};

const TYPE_TEXT: Record<SkillUnitType, string> = {
    general: "Generäle für Kämpfe und Abenteuer",
    explorer: "Entdecker für Schatz- und Abenteuersuchen",
    geologist: "Geologen für Rohstoffvorkommen",
};

export async function openSkillWizard(onSaved: () => void): Promise<void> {
    const user = await getCurrentUser();

    if (!user) {
        openDialog(`<h3 class="wiz-title">Bitte melde dich an</h3><p class="dlg-note">Skillungen können nur eingeloggte Mitglieder speichern.</p>`);
        return;
    }

    // Eigene Skillungen: wichtig für die Regel "gleicher Spezialist => anderer Zusatz"
    const { builds } = await loadBuilds();
    const mine = builds.filter((build) => build.userId === user.id);

    stepType(user, mine, onSaved);
}

function stepType(user: CurrentUser, mine: SkillBuild[], onSaved: () => void): void {
    const dialog = openDialog(`
        <h3 class="wiz-title">Neuen Skill hinzufügen</h3>
        <p class="dlg-note">Wofür möchtest du eine Skillung teilen? Als Ersteller wird dein Spielername <b>${esc(user.username)}</b> angezeigt.</p>
        <div class="wiz-types">
            ${(Object.keys(UNIT_TYPE_LABEL) as SkillUnitType[])
                .map(
                    (type) => `
                <button type="button" class="wiz-type" data-type="${type}">
                    <svg class="wiz-type__icon"><use href="#${TYPE_ICON[type]}" /></svg>
                    <strong>${UNIT_TYPE_LABEL[type]}</strong>
                    <span>${TYPE_TEXT[type]}</span>
                </button>`
                )
                .join("")}
        </div>`);

    dialog.querySelectorAll<HTMLButtonElement>("[data-type]").forEach((button) => {
        button.addEventListener("click", () => stepUnit(user, mine, button.dataset.type as SkillUnitType, onSaved));
    });
}

function stepUnit(user: CurrentUser, mine: SkillBuild[], type: SkillUnitType, onSaved: () => void): void {
    const units = unitsOf(type);

    const dialog = openDialog(`
        <button type="button" class="wiz-back" data-back>← Zurück</button>
        <h3 class="wiz-title">${UNIT_TYPE_LABEL[type]} auswählen</h3>
        <label class="view-field">
            <span>Suche</span>
            <input type="search" id="wiz-search" placeholder="Name eingeben …" autocomplete="off" />
        </label>
        <div class="pick-list" id="wiz-list"></div>`);

    const list = dialog.querySelector<HTMLElement>("#wiz-list")!;
    const search = dialog.querySelector<HTMLInputElement>("#wiz-search")!;

    function renderList(): void {
        const query = search.value.trim().toLowerCase();
        const shown = units.filter((unit) => unit.name.toLowerCase().includes(query));

        list.innerHTML = shown.length
            ? shown
                  .map((unit) => {
                      const count = mine.filter((b) => b.unitType === type && b.unitSlug === unit.slug).length;

                      return `
                <button type="button" class="pick-item" data-slug="${unit.slug}">
                    <span class="spec-avatar${unit.abbr.length > 2 ? " spec-avatar--long" : ""}">${esc(unit.abbr)}</span>
                    <span class="pick-item__name">${esc(unit.name)}</span>
                    <span class="pick-item__hint">${count ? `${count} von dir` : esc(unit.hint)}</span>
                </button>`;
                  })
                  .join("")
            : `<p class="view-empty">Nichts gefunden.</p>`;
    }

    renderList();
    search.addEventListener("input", renderList);
    search.focus();

    dialog.querySelector("[data-back]")?.addEventListener("click", () => stepType(user, mine, onSaved));

    list.addEventListener("click", (event) => {
        const item = (event.target as HTMLElement).closest<HTMLElement>("[data-slug]");
        const unit = units.find((u) => u.slug === item?.dataset.slug);

        if (unit) {
            stepSkills(user, mine, type, unit, onSaved);
        }
    });
}

function stepSkills(user: CurrentUser, mine: SkillBuild[], type: SkillUnitType, unit: UnitInfo, onSaved: () => void): void {
    const existing = mine.filter((b) => b.unitType === type && b.unitSlug === unit.slug);
    const titleRequired = existing.length > 0;
    let levels = emptyLevels(type);

    const dialog = openDialog(
        `
        <button type="button" class="wiz-back" data-back>← Zurück</button>

        <header class="dlg-head">
            <span class="spec-avatar${unit.abbr.length > 2 ? " spec-avatar--long" : ""}">${esc(unit.abbr)}</span>
            <div>
                <h3>${esc(unit.name)}</h3>
                <div class="spec-tags"><span class="spec-tag spec-tag--gold">${UNIT_TYPE_LABEL[type]}</span><span class="spec-tag">Ersteller: ${esc(user.username)}</span></div>
            </div>
        </header>

        <label class="view-field wiz-title-field">
            <span>Zusatz / Verwendungszweck ${titleRequired ? "(Pflicht)" : "(optional)"}</span>
            <input type="text" id="wiz-title" maxlength="40" autocomplete="off"
                placeholder="${titleRequired ? "z. B. Schatzsuche lang, Abenteuer-Bosse …" : "z. B. Allrounder – bei weiteren Skillungen wird ein Zusatz Pflicht"}" />
        </label>
        ${
            titleRequired
                ? `<p class="dlg-hint">Du hast für ${esc(unit.name)} schon ${existing.length} Skillung${existing.length > 1 ? "en" : ""}${
                      existing.some((b) => b.title) ? ` (${existing.map((b) => esc(b.title || "ohne Zusatz")).join(", ")})` : ""
                  }. Der Zusatz muss sich unterscheiden.</p>`
                : ""
        }

        <div class="skill-points" id="wiz-points"></div>
        <div id="wiz-tree"></div>

        <p class="wiz-message" id="wiz-message" role="alert"></p>

        <div class="dlg-actions">
            <button type="button" class="wiz-button wiz-button--ghost" id="wiz-reset">Zurücksetzen</button>
            <button type="button" class="wiz-button" id="wiz-save">Skillung speichern</button>
        </div>`,
        "member-dialog--wide"
    );

    const tree = dialog.querySelector<HTMLElement>("#wiz-tree")!;
    const points = dialog.querySelector<HTMLElement>("#wiz-points")!;
    const message = dialog.querySelector<HTMLElement>("#wiz-message")!;
    const titleInput = dialog.querySelector<HTMLInputElement>("#wiz-title")!;
    const saveButton = dialog.querySelector<HTMLButtonElement>("#wiz-save")!;

    function refresh(): void {
        tree.innerHTML = treeHtml(type, levels, "edit");
        points.innerHTML = pointsHtml(type, levels);
    }

    function change(index: number, delta: number): void {
        const next = levels[index] + delta;

        if (next >= 0 && next <= SKILL_TREES[type][index].max && canSetLevel(type, levels, index, next)) {
            levels = levels.slice();
            levels[index] = next;
            message.textContent = "";
            refresh();
        }
    }

    refresh();

    tree.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        const slot = target.closest<HTMLElement>("[data-i]");

        if (!slot || (target.closest("button") && target.closest("button")?.hasAttribute("disabled"))) {
            return;
        }

        const index = Number(slot.dataset.i);

        if (target.closest("[data-dec]")) {
            change(index, -1);
        } else if (target.closest("[data-inc]")) {
            change(index, 1);
        }
    });

    // Rechtsklick auf ein Feld = eine Stufe weniger
    tree.addEventListener("contextmenu", (event) => {
        const slot = (event.target as HTMLElement).closest<HTMLElement>("[data-i]");

        if (slot) {
            event.preventDefault();
            change(Number(slot.dataset.i), -1);
        }
    });

    dialog.querySelector("#wiz-reset")?.addEventListener("click", () => {
        levels = emptyLevels(type);
        message.textContent = "";
        refresh();
    });

    dialog.querySelector("[data-back]")?.addEventListener("click", () => stepUnit(user, mine, type, onSaved));

    saveButton.addEventListener("click", async () => {
        const title = titleInput.value.trim();

        if (levels.every((level) => level === 0)) {
            message.textContent = "Verteile mindestens einen Skillpunkt.";
            return;
        }

        if (titleRequired) {
            if (!title) {
                message.textContent = `Du hast für ${unit.name} schon eine Skillung – gib einen Zusatz an, wofür diese gedacht ist.`;
                titleInput.focus();
                return;
            }
            if (existing.some((b) => b.title.toLowerCase() === title.toLowerCase())) {
                message.textContent = "Diesen Zusatz hast du für diesen Spezialisten schon verwendet.";
                titleInput.focus();
                return;
            }
        }

        saveButton.disabled = true;
        message.textContent = "Wird gespeichert …";

        const error = await saveBuild({ unitType: type, unitSlug: unit.slug, title, skills: levels });

        saveButton.disabled = false;

        if (error) {
            message.textContent = error;
            return;
        }

        dialog.close();
        onSaved();
    });
}

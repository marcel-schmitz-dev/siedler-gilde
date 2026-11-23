import { esc } from "./dom.js";
import { BOOK_LABEL, BOOKS_PER_ROW_UNLOCK, ROW_SIZES, SKILL_POINT_LIMIT, SKILL_TREES, bookTypeOfRow, booksBelowRow, booksByType, booksNeededForRow, canSetLevel, isRowUnlocked, rowCount, skillIconUrl, totalPoints, } from "./data/skill-trees.js";
function slotHtml(type, levels, index, mode) {
    const slot = SKILL_TREES[type][index];
    const level = levels[index];
    const name = slot.label ?? slot.icon;
    const state = level === 0 ? "is-empty" : level === slot.max ? "is-full" : "is-part";
    const img = `<img src="${skillIconUrl(slot.icon)}" alt="" loading="lazy" data-fallback="${esc(name)}" />`;
    const lvl = `<span class="skill-tile__level">${level}/${slot.max}</span>`;
    if (mode !== "edit") {
        return `<div class="skill-tile ${state}" title="${esc(name)}: ${level}/${slot.max}">${img}${lvl}</div>`;
    }
    const canUp = level < slot.max && canSetLevel(type, levels, index, level + 1);
    const canDown = level > 0 && canSetLevel(type, levels, index, level - 1);
    return `
        <div class="skill-slot" data-i="${index}">
            <div class="skill-tile ${state}" data-inc title="${esc(name)} – Klick: +1, Rechtsklick: −1">${img}${lvl}</div>
            <span class="skill-slot__name">${esc(name)}</span>
            <div class="skill-slot__ctrl">
                <button type="button" data-dec aria-label="${esc(name)}: eine Stufe weniger" ${canDown ? "" : "disabled"}>−</button>
                <button type="button" data-inc aria-label="${esc(name)}: eine Stufe mehr" ${canUp ? "" : "disabled"}>+</button>
            </div>
        </div>`;
}
export function treeHtml(type, levels, mode) {
    const sizes = ROW_SIZES[type];
    const total = rowCount(type);
    let index = 0;
    const rows = sizes.map((size, r) => {
        const row = total - r; // oberste Zeile = höchste Reihe
        const cells = [];
        for (let k = 0; k < size; k++) {
            cells.push(slotHtml(type, levels, index++, mode));
        }
        let head = "";
        if (mode === "edit") {
            const unlocked = isRowUnlocked(type, levels, row);
            const missing = booksNeededForRow(row) - booksBelowRow(type, levels, row);
            const status = unlocked
                ? ""
                : `<em>🔒 noch ${missing} Buch${missing === 1 ? "" : "er"} in den Reihen darunter nötig</em>`;
            head = `<div class="skill-row__head"><b>Reihe ${row}</b> · ${BOOK_LABEL[bookTypeOfRow(type, row)]}${status}</div>`;
            return `<div class="skill-row ${unlocked ? "" : "is-locked"}">${head}<div class="skill-row__cells">${cells.join("")}</div></div>`;
        }
        return `<div class="skill-row"><div class="skill-row__cells">${cells.join("")}</div></div>`;
    });
    return `<div class="skill-tree skill-tree--${mode}">${rows.join("")}</div>`;
}
export function pointsHtml(type, levels) {
    const books = booksByType(type, levels);
    const parts = Object.keys(BOOK_LABEL)
        .filter((key) => books[key] > 0)
        .map((key) => `${books[key]} ${BOOK_LABEL[key]}`);
    return `
        <strong>${totalPoints(levels)} / ${SKILL_POINT_LIMIT[type]}</strong> Bücher
        ${parts.length ? `<span class="skill-points__books">${parts.join(" · ")}</span>` : ""}
        <span class="skill-points__hint">Je ${BOOKS_PER_ROW_UNLOCK} Bücher schalten die nächste Reihe frei.</span>`;
}
//# sourceMappingURL=skill-tree-ui.js.map
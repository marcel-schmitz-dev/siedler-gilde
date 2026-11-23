// ==================================================
// SKILLBÄUME (20 Felder = 4 Spalten x 5 Zeilen)
// Alle Generäle teilen sich einen Baum, alle Entdecker und alle Geologen ebenfalls.
// Struktur (Icons, Maximalstufen, Reihenfolge): tsowiki.eu – ohne Beispiel-Verteilung, Stufen starten bei 0.
// Deutsche Skill-Namen: dsowiki.de (…/generaele|entdecker|geologen/skills).
// Icons liegen lokal unter assets/img/skill-icons/ (Download: `npm run icons`, Quelle tsowiki.eu/icons/skills/).
// ==================================================
function s(icon, max, label) {
    return label ? { icon, max, label } : { icon, max };
}
export const GENERAL_TREE = [
    s("lightning_slash2", 1, "Blitzangriff"),
    s("master_planner", 1, "Meisterstratege"),
    s("bounty_hunter", 1, "Kopfgeldjäger"),
    s("1-up", 1, "Extraleben"),
    s("cleave", 3, "Spalten"),
    s("weekly_maintenance", 3, "Wöchentliche Wartung"),
    s("garrison_annex", 3, "Garnisonsanbau"),
    s("confident_leader", 3, "Souveräner Anführer"),
    s("unstoppable_charge3", 3, "Unaufhaltsamer Sturm"),
    s("battle_frenzy", 3, "Kampfrausch"),
    s("fast_learner", 3, "Blitzdenker"),
    s("just_a_flesh_wound", 3, "Nur eine Fleischwunde"),
    s("sniper training_new", 3, "Scharfschützenausbildung"),
    s("overrun2", 3, "Überrennen"),
    s("hostile_takeover", 3, "Feindliche Übernahme"),
    s("navigation_crash_course", 3, "Navigationsschnellkurs"),
    s("rapid_fire", 3, "Schnellfeuer"),
    s("jaggernaut", 3, "Moloch"),
    s("first_aid", 3, "Erste Hilfe"),
    s("jog", 3, "Trab"),
];
export const EXPLORER_TREE = [
    s("icon_sophisitcated_pillager", 1, "Raffinierter Plünderer"),
    s("icon_streetwise_negotiator", 1, "Gewiefter Unterhändler"),
    s("icon_travelling_erudite", 1, "Reisender Gelehrter"),
    s("icon_bean_a_colada", 1, "Bohnität"),
    s("icon_hero_ore", 3, "Heldenerz"),
    s("icon_trouble_seeker", 3, "Auf Ärger aus"),
    s("icon_faster_search04", 3, "Forschungssemester"),
    s("icon_pathfinder", 3, "Pfadfinder"),
    s("icon_loot_wagon", 3, "Beutewagen"),
    s("icon_sturdy_shovel", 3, "Robuste Schaufel"),
    s("icon_mist_walker", 3, "Nebelgänger"),
    s("icon_travel_cost", 3, "Reisekosten"),
    s("icon_powder_sack", 3, "Kahlschlag"),
    s("icon_offbeat_roads", 3, "Abseitige Pfade"),
    s("icon_wild_determination", 3, "Wilde Entschlossenheit"),
    s("icon_faster_search02", 3, "Verlängertes Wochenende"),
    s("icon_fearless_hiker", 3, "Furchtloser Wandersmann"),
    s("icon_lucky_detour", 3, "Abkürzung"),
    s("icon_faster_search03", 3, "Pilgerschaft"),
    s("icon_mountain_boots", 3, "Bergsteigerstiefel"),
];
export const GEOLOGIST_TREE = [
    s("icon_lucky_find", 1, "Glückstreffer"),
    s("icon_natural_vein_all", 1, "Geborenes Gräbertalent"),
    s("icon_natures_gift", 1, "Schicksalsgabe"),
    s("icon_two_in_one_coal", 3, "Doppelter Kohlefund"),
    s("icon_quality_shaft_gold", 3, "Verstärkte Goldschächte"),
    s("icon_ore_collector", 3, "Erzsammler"),
    s("icon_hidden_stash_coal", 3, "Versteckte Kohlevorräte"),
    s("icon_mining_surplus_iron", 3, "Eisenabbau-Überschuss"),
    s("icon_natural_vein_gold", 3, "Natürliche Goldader"),
    s("icon_quality_shaft_coal", 3, "Verstärkte Kohleschächte"),
    s("icon_tendentious_geologist", 3, "Routinierter Geologe"),
    s("icon_mining_surplus_gold", 3, "Goldabbau-Überschuss"),
    s("icon_natural_vein_marble", 3, "Natürliche Marmorader"),
    s("icon_mining_surplus_copper", 3, "Kupferabbau-Überschuss"),
    s("icon_two_in_one_iron", 3, "Doppelter Eisenfund"),
    s("icon_two_in_one_marble", 3, "Doppelter Marmorfund"),
    s("icon_quality_shaft_copper", 3, "Verstärkte Kupferschächte"),
    s("icon_natural_vein_stone", 3, "Natürliche Steinader"),
    s("icon_hidden_stash_stone", 3, "Versteckte Steinvorräte"),
    s("icon_natural_vein_copper", 3, "Natürliche Kupferader"),
];
export const SKILL_TREES = {
    general: GENERAL_TREE,
    explorer: EXPLORER_TREE,
    geologist: GEOLOGIST_TREE,
};
/** Maximale Skillpunkte (= Bücher) zum Verteilen. */
export const SKILL_POINT_LIMIT = {
    general: 21,
    explorer: 21,
    geologist: 31,
};
// Aufbau: Das Raster ist von oben nach unten angeordnet (Reihe 1 = unten, Spitze = oberste Reihe).
// ROW_SIZES nennt die Feldanzahl je Reihe von OBEN nach unten.
export const ROW_SIZES = {
    general: [4, 4, 4, 4, 4], // Reihe 5 (Spitze, max. Stufe 1) … Reihe 1
    explorer: [4, 4, 4, 4, 4],
    geologist: [3, 3, 3, 3, 3, 3, 2], // Reihe 7 (Spitze, max. Stufe 1) … Reihe 1
};
export const BOOK_LABEL = {
    manuskript: "Manuskripte",
    kompendium: "Kompendien",
    kodex: "Kodizes",
};
// Benötigte Buchart je Reihe, Index 0 = Reihe 1 (unten)
const ROW_BOOKS = {
    general: ["manuskript", "kompendium", "kompendium", "kodex", "kodex"],
    explorer: ["manuskript", "kompendium", "kompendium", "kodex", "kodex"],
    geologist: ["manuskript", "manuskript", "kompendium", "kompendium", "kodex", "kodex", "kodex"],
};
/** Je 5 investierte Bücher in den Reihen darunter schalten die nächste Reihe frei. */
export const BOOKS_PER_ROW_UNLOCK = 5;
export const UNIT_TYPE_LABEL = {
    general: "General",
    explorer: "Entdecker",
    geologist: "Geologe",
};
/** Dateiname des lokalen Icons (Leerzeichen im Original-Namen werden zu "_"). */
export function iconFileName(icon) {
    return `${icon.replace(/\s+/g, "_")}.webp`;
}
export function skillIconUrl(icon) {
    return `./assets/img/skill-icons/${encodeURIComponent(iconFileName(icon))}`;
}
/** Reihe eines Feldes: 1 = unterste Reihe, höchste Zahl = Spitze. */
export function rowOf(type, index) {
    const sizes = ROW_SIZES[type];
    let start = 0;
    for (let r = 0; r < sizes.length; r++) {
        start += sizes[r];
        if (index < start) {
            return sizes.length - r;
        }
    }
    return 1;
}
export function rowCount(type) {
    return ROW_SIZES[type].length;
}
export function bookTypeOfRow(type, row) {
    return ROW_BOOKS[type][row - 1];
}
/** Bücher, die in den Reihen unterhalb von `row` investiert sein müssen. */
export function booksNeededForRow(row) {
    return BOOKS_PER_ROW_UNLOCK * (row - 1);
}
/** Startwerte: alle Skills auf 0 (Reihenfolge = Reihenfolge des Baums). */
export function emptyLevels(type) {
    return SKILL_TREES[type].map(() => 0);
}
export function totalPoints(levels) {
    return levels.reduce((sum, level) => sum + level, 0);
}
export function pointsLeft(type, levels) {
    return SKILL_POINT_LIMIT[type] - totalPoints(levels);
}
/** Investierte Bücher in allen Reihen unterhalb von `row`. */
export function booksBelowRow(type, levels, row) {
    return levels.reduce((sum, level, i) => (rowOf(type, i) < row ? sum + level : sum), 0);
}
export function isRowUnlocked(type, levels, row) {
    return booksBelowRow(type, levels, row) >= booksNeededForRow(row);
}
/** Verbrauchte Bücher je Buchart (für die Anzeige auf der Karte). */
export function booksByType(type, levels) {
    const result = { manuskript: 0, kompendium: 0, kodex: 0 };
    levels.forEach((level, i) => {
        result[bookTypeOfRow(type, rowOf(type, i))] += level;
    });
    return result;
}
/**
 * Prüft eine Skillung: Länge, ganze Zahlen 0..max, Punktelimit
 * und die Freischaltung der Reihen (5 Bücher darunter je Reihe).
 */
export function isValidLevels(type, levels) {
    const tree = SKILL_TREES[type];
    if (!Array.isArray(levels) ||
        levels.length !== tree.length ||
        !levels.every((level, i) => Number.isInteger(level) && level >= 0 && level <= tree[i].max) ||
        totalPoints(levels) > SKILL_POINT_LIMIT[type]) {
        return false;
    }
    return levels.every((level, i) => level === 0 || isRowUnlocked(type, levels, rowOf(type, i)));
}
/** Darf Feld `index` auf `newLevel` gesetzt werden, ohne dass die Skillung ungültig wird? */
export function canSetLevel(type, levels, index, newLevel) {
    const next = levels.slice();
    next[index] = newLevel;
    return isValidLevels(type, next);
}
//# sourceMappingURL=skill-trees.js.map
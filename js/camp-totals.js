import { BATTLE_UNITS, findBattleUnit } from "./data/units.js";
// Alle Einheiten der Lager zusammengezählt, in der Reihenfolge der Einheiten-Liste
export function totalUnits(camps) {
    const units = new Map();
    const fk = new Map();
    camps.forEach((camp) => {
        camp.units.forEach((entry) => units.set(entry.unit, (units.get(entry.unit) ?? 0) + entry.count));
        camp.fk.forEach((entry) => fk.set(entry.name, (fk.get(entry.name) ?? 0) + entry.count));
    });
    return {
        units: BATTLE_UNITS.filter((unit) => units.has(unit.slug)).map((unit) => ({
            abbr: unit.abbr,
            name: unit.name,
            count: units.get(unit.slug) ?? 0,
        })),
        fk: [...fk.entries()].map(([name, count]) => ({ name, count })),
    };
}
// Verluste stehen als Text im Lager ("262 SK 46 BSK"). Gezählt wird alles, was nach Zahl und bekanntem Kürzel aussieht.
export function totalLosses(camps) {
    const sums = new Map();
    let unreadable = false;
    camps.forEach((camp) => {
        const text = camp.losses.trim();
        if (!text) {
            return;
        }
        const rest = text.replace(/(\d+)\s*([A-Za-zÄÖÜäöü]{1,4})/g, (_match, amount, abbr) => {
            const unit = BATTLE_UNITS.find((item) => item.abbr.toLowerCase() === abbr.toLowerCase());
            if (unit) {
                sums.set(unit.slug, (sums.get(unit.slug) ?? 0) + Number(amount));
                return " ";
            }
            return _match;
        });
        if (/[A-Za-z0-9ÄÖÜäöü]/.test(rest)) {
            unreadable = true;
        }
    });
    const items = [];
    BATTLE_UNITS.forEach((unit) => {
        const count = sums.get(unit.slug);
        if (count) {
            items.push({ abbr: unit.abbr, name: findBattleUnit(unit.slug)?.name ?? unit.name, count });
        }
    });
    return { items, unreadable };
}
//# sourceMappingURL=camp-totals.js.map
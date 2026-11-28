import { BATTLE_UNITS, findBattleUnit } from "./data/units.js";
import type { Camp, Pin } from "./tactic-store.js";

export interface TotalEntry {
    abbr: string;
    name: string;
    count: number;
}

export interface FkTotal {
    name: string;
    count: number;
}

// Alle Einheiten der Lager zusammengezählt, in der Reihenfolge der Einheiten-Liste
// Vorwellen, Leech-Einträge und Fernkampf-Textmarken zählen mit
export function totalUnits(camps: Camp[], pins: Pin[] = []): { units: TotalEntry[]; fk: FkTotal[] } {
    const units = new Map<string, number>();
    const fk = new Map<string, number>();

    camps.forEach((camp) => {
        camp.units.forEach((entry) => units.set(entry.unit, (units.get(entry.unit) ?? 0) + entry.count));
        camp.vanguard?.units.forEach((entry) => units.set(entry.unit, (units.get(entry.unit) ?? 0) + entry.count));
        camp.fk.forEach((entry) => fk.set(entry.name, (fk.get(entry.name) ?? 0) + entry.count));
    });

    pins.forEach((pin) => {
        pin.units?.forEach((entry) => units.set(entry.unit, (units.get(entry.unit) ?? 0) + entry.count));
        pin.fk?.forEach((entry) => fk.set(entry.name, (fk.get(entry.name) ?? 0) + entry.count));
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
export function totalLosses(camps: Camp[], pins: Pin[] = []): { items: TotalEntry[]; unreadable: boolean } {
    const sums = new Map<string, number>();
    let unreadable = false;

    const texts = [...camps.map((camp) => camp.losses), ...pins.map((pin) => pin.losses ?? "")];

    texts.forEach((raw) => {
        const text = raw.trim();

        if (!text) {
            return;
        }

        const rest = text.replace(/(\d+)\s*([A-Za-zÄÖÜäöü]{1,4})/g, (_match, amount: string, abbr: string) => {
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

    const items: TotalEntry[] = [];

    BATTLE_UNITS.forEach((unit) => {
        const count = sums.get(unit.slug);

        if (count) {
            items.push({ abbr: unit.abbr, name: findBattleUnit(unit.slug)?.name ?? unit.name, count });
        }
    });

    return { items, unreadable };
}

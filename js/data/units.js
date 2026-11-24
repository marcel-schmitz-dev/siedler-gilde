// Die neun Einheiten aus der Kaserne. Auf dsowiki.de/einheiten stehen 16 Einträge,
// fehlende (z. B. Söldner) hier einfach ergänzen.
export const BATTLE_UNITS = [
    { slug: "rekrut", name: "Rekrut", abbr: "R" },
    { slug: "milizsoldat", name: "Milizsoldat", abbr: "M" },
    { slug: "soldat", name: "Soldat", abbr: "S" },
    { slug: "elitesoldat", name: "Elitesoldat", abbr: "E" },
    { slug: "kavallerie", name: "Kavallerie", abbr: "K" },
    { slug: "bogenschuetze", name: "Bogenschütze", abbr: "B" },
    { slug: "langbogenschuetze", name: "Langbogenschütze", abbr: "LB" },
    { slug: "armbrustschuetze", name: "Armbrustschütze", abbr: "AB" },
    { slug: "kanonier", name: "Kanonier", abbr: "KN" },
];
export function findBattleUnit(slug) {
    return BATTLE_UNITS.find((unit) => unit.slug === slug);
}
//# sourceMappingURL=units.js.map
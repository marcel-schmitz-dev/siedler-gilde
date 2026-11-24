// Werte und Namen von dsowiki.de/einheiten. Die Kürzel sind die in der Gilde üblichen, bei Bedarf hier anpassen.
export const BATTLE_UNITS = [
    { slug: "rekrut", name: "Rekrut", abbr: "R", hp: 40, damage: "15–30", accuracy: 80, attack: "Normal" },
    { slug: "miliz", name: "Miliz", abbr: "M", hp: 60, damage: "20–40", accuracy: 80, attack: "Normal" },
    { slug: "soldat", name: "Soldat", abbr: "S", hp: 90, damage: "20–40", accuracy: 85, attack: "Normal" },
    { slug: "elitesoldat", name: "Elitesoldat", abbr: "ES", hp: 120, damage: "20–40", accuracy: 90, attack: "Normal" },
    { slug: "reiterei", name: "Reiterei", abbr: "C", hp: 5, damage: "5–10", accuracy: 80, attack: "Erstschlag" },
    { slug: "bogenschuetze", name: "Bogenschütze", abbr: "B", hp: 10, damage: "20–40", accuracy: 80, attack: "Normal" },
    { slug: "langbogenschuetze", name: "Langbogenschütze", abbr: "LB", hp: 10, damage: "30–60", accuracy: 80, attack: "Normal" },
    { slug: "armbrustschuetze", name: "Armbrustschütze", abbr: "AM", hp: 10, damage: "45–90", accuracy: 80, attack: "Normal" },
    { slug: "kanonier", name: "Kanonier", abbr: "K", hp: 60, damage: "45–90", accuracy: 80, attack: "Letzter Angriff" },
    { slug: "schwertkaempfer", name: "Schwertkämpfer", abbr: "SK", hp: 150, damage: "40–80", accuracy: 90, attack: "Normal" },
    { slug: "berittener-schwertkaempfer", name: "Berittener Schwertkämpfer", abbr: "MSK", hp: 250, damage: "25–50", accuracy: 90, attack: "Normal" },
    { slug: "ritter", name: "Ritter", abbr: "RI", hp: 80, damage: "35–70", accuracy: 90, attack: "Erstschlag" },
    { slug: "scharfschuetze", name: "Scharfschütze", abbr: "SS", hp: 50, damage: "50–100", accuracy: 90, attack: "Normal" },
    { slug: "gepanzerter-scharfschuetze", name: "Gepanzerter Scharfschütze", abbr: "GSS", hp: 50, damage: "100–200", accuracy: 90, attack: "Normal" },
    { slug: "berittener-scharfschuetze", name: "Berittener Scharfschütze", abbr: "BSS", hp: 50, damage: "50–100", accuracy: 90, attack: "Erstschlag" },
    { slug: "belagerer", name: "Belagerer", abbr: "BEL", hp: 80, damage: "100–200", accuracy: 90, attack: "Letzter Angriff" },
];
export function findBattleUnit(slug) {
    return BATTLE_UNITS.find((unit) => unit.slug === slug);
}
//# sourceMappingURL=units.js.map
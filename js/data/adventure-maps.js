// ==================================================
// DATEN: ABENTEUER-KARTEN
// Neue Karte = Bild unter assets/img_karten/ ablegen
// und hier einen Eintrag in ADVENTURE_MAPS ergänzen.
// ==================================================
export const MAP_CATEGORIES = [
    { id: "klassisch", title: "Klassisch", description: "Taktikkarten und Aufstellungen für klassische Abenteuer." },
    { id: "maerchen", title: "Märchen", description: "Taktikkarten und Aufstellungen für Märchen-Abenteuer." },
    { id: "szenario", title: "Szenario", description: "Taktikkarten und Aufstellungen für Szenario-Abenteuer." },
    { id: "unternehmungen", title: "Unternehmungen", description: "Taktikkarten und Aufstellungen für Unternehmungen." },
    { id: "koop", title: "Koop", description: "Taktikkarten und Aufstellungen für Koop-Abenteuer." },
];
export const ADVENTURE_MAPS = [
    {
        category: "maerchen",
        title: "Ali Baba der junge Holzfäller",
        image: "./assets/img_karten/holzi-matze85s.png",
        author: "Matze85s",
    },
];
//# sourceMappingURL=adventure-maps.js.map
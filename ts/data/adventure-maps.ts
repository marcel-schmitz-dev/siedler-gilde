// ==================================================
// DATEN: ABENTEUER-KARTEN
// Neue Karte = Bild unter assets/img_karten/ ablegen
// und hier einen Eintrag in ADVENTURE_MAPS ergänzen.
// ==================================================

export type MapCategoryId = "klassisch" | "maerchen" | "szenario" | "unternehmungen" | "koop";

export interface MapCategory {
    id: MapCategoryId;
    title: string;
    description: string;
}

export interface AdventureMap {
    category: MapCategoryId;
    title: string;
    image: string;
    author?: string;
}

export const MAP_CATEGORIES: MapCategory[] = [
    { id: "klassisch", title: "Klassisch", description: "Taktikkarten und Aufstellungen für klassische Abenteuer." },
    { id: "maerchen", title: "Märchen", description: "Taktikkarten und Aufstellungen für Märchen-Abenteuer." },
    { id: "szenario", title: "Szenario", description: "Taktikkarten und Aufstellungen für Szenario-Abenteuer." },
    { id: "unternehmungen", title: "Unternehmungen", description: "Taktikkarten und Aufstellungen für Unternehmungen." },
    { id: "koop", title: "Koop", description: "Taktikkarten und Aufstellungen für Koop-Abenteuer." },
];

export const ADVENTURE_MAPS: AdventureMap[] = [
    {
        category: "maerchen",
        title: "Ali Baba der junge Holzfäller",
        image: "./assets/img_karten/holzi-matze85s.png",
        author: "Matze85s",
    },
];

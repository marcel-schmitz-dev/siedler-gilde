// ==================================================
// DATEN: MINI GAMES
// Neues Mini Game = einfach einen Eintrag in MINIGAMES ergänzen.
// Vorschaubild: lokal unter assets/img/minigames/ ablegen (Format ca. 3:2).
// Fehlt das Bild, zeigt die Karte automatisch den Titel als Platzhalter.
// Leere Links (""): der Button zeigt dann "Kommt bald".
// ==================================================

export interface MiniGame {
    title: string;
    description: string;
    badge?: string; // kleine Markierung auf der Karte
    image: string;
    liveUrl: string;
    githubUrl: string;
}

const PAGES = "https://marcel-schmitz-dev.github.io";
const GITHUB = "https://github.com/marcel-schmitz-dev";

export const MINIGAMES: MiniGame[] = [
    {
        title: "Der fliegende Entdecker",
        description: "Selbst erstellt für die Gilde – mit Gilden-Bestenliste.",
        badge: "Für die Gilde",
        image: "./assets/img/minigames/der-fliegende-entdecker.webp",
        liveUrl: `${PAGES}/der-fliegende-entdecker/`,
        githubUrl: `${GITHUB}/der-fliegende-entdecker`,
    },
    {
        title: "ByteRunner",
        description: "Cyberpunk-Jump-’n’-Run mit Discs und Endboss.",
        badge: "Weiterbildungsprojekt",
        // Vorschaubild liegt auf der eigenen GitHub-Pages-Seite; später gern lokal ablegen
        image: `${PAGES}/ByteRunner/assets/img/screenshot_game.webp`,
        liveUrl: `${PAGES}/ByteRunner/`,
        githubUrl: `${GITHUB}/ByteRunner`,
    },
    {
        title: "Crystal Caos",
        description: "Actionspiel im Querformat – spielbar, wird noch verbessert.",
        badge: "In Arbeit",
        image: "./assets/img/minigames/crystal-caos.webp",
        liveUrl: `${PAGES}/Crystal-Caos/`,
        githubUrl: `${GITHUB}/Crystal-Caos`,
    },
    {
        title: "Sharkie",
        description: "Jump-and-Run unter Wasser.",
        image: "./assets/img/minigames/sharkie.webp",
        // TODO: echte Links eintragen
        liveUrl: "",
        githubUrl: "",
    },
];

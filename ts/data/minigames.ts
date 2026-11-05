// ==================================================
// DATEN: MINI GAMES
// Neues Mini Game = einfach einen Eintrag in MINIGAMES ergänzen.
// Bild ablegen unter assets/img/minigames/ (empfohlen: 4:3 oder 3:2).
// Leere Links (""): der Button zeigt dann "Kommt bald".
// ==================================================

export interface MiniGame {
    title: string;
    description: string;
    image: string;
    liveUrl: string;
    githubUrl: string;
}

export const MINIGAMES: MiniGame[] = [
    {
        title: "Sharkie",
        description: "Jump-and-Run unter Wasser.",
        image: "./assets/img/minigames/sharkie.webp",
        // TODO: echte Links eintragen
        liveUrl: "",
        githubUrl: "",
    },
];

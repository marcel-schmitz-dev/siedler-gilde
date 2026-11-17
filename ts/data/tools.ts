// ==================================================
// DATEN: TOOLS (z. B. Kampfsimulator)
// ==================================================

export interface Tool {
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    image: string;
    liveUrl: string;
    githubUrl: string;
}

export const SIMULATOR: Tool = {
    title: "NEONFRONT",
    subtitle: "Siedler Kampflabor",
    description:
        "Unser Kampfsimulator für Die Siedler Online: Abenteuer simulieren, Generäle skillen und die beste Armee pro Lager finden – direkt hier im Mitgliederbereich.",
    features: [
        "Generäle skillen mit eigenem Skill-Dialog",
        "Einheitensuche: beste Armee pro Lager",
        "Plan direkt auf der Abenteuerkarte",
    ],
    // Vorschaubild liegt lokal; der Simulator läuft auf einer eigenen IONOS-Subdomain
    image: "./assets/img/minigames/neonfront.webp",
    liveUrl: "https://neonfront-kampfsimulator.mschmitz-dev.de/",
    githubUrl: "https://github.com/marcel-schmitz-dev/neonfront-Kampf-Simulator",
};

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
    // Vorschaubild liegt in der Doku des Projekts; später gern lokal unter assets/img/ ablegen
    image: "https://marcel-schmitz-dev.github.io/neonfront-Kampf-Simulator/docs/preview.png",
    liveUrl: "https://marcel-schmitz-dev.github.io/neonfront-Kampf-Simulator/",
    githubUrl: "https://github.com/marcel-schmitz-dev/neonfront-Kampf-Simulator",
};

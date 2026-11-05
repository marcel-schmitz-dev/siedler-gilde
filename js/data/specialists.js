// ==================================================
// DATEN: GENERÄLE & ENTDECKER
// Quelle der Werte: https://tsowiki.eu (inoffizielles Fan-Wiki, Grafiken/Texte © Ubisoft)
// Die Beschreibungen sind hier gekürzt und umformuliert.
// ==================================================
// Basis-URL für Icons und Garnison-Bilder.
// Besser später lokal ablegen, z. B. "./assets/img/tsowiki/", damit nicht von fremdem Server geladen wird.
export const TSOWIKI_BASE = "https://tsowiki.eu";
export const TSOWIKI_PAGE = `${TSOWIKI_BASE}/de/specialists/pages/`;
const FLANK = "Flankenangriff";
const SPLASH = "Flächenschaden";
function g(slug, name, special, capacity, travelMin, roundSec, recoveryMin, hp, damage, accuracy, initiative, abilities = []) {
    return { slug, name, special, capacity, travelMin, roundSec, recoveryMin, hp, damage, accuracy, initiative, abilities };
}
// slug, Name, Besonderheit, Garnison, Reise(min), Runde(s), Erholung(min), Leben, Angriff, Treffsicherheit, Initiative, Fähigkeiten
export const GENERALS = [
    g("general", "General", "", 200, 30, 20, 240, 1, "120-120", 80, "Normal"),
    g("veteran", "Veteran", "", 250, 15, 10, 120, 1, "120-120", 80, "Normal"),
    g("generalmajor", "Generalmajor", "", 270, 15, 10, 120, 1, "120-120", 80, "Normal"),
    g("alterer-zwillingsgeneral", "Älterer Zwillingsgeneral", "Stellt nach jedem Kampf 20 % der verlorenen Einheiten wieder her. Verkürzte Erholungszeit (stapelt sich nicht mit „Nur eine Fleischwunde“).", 280, 15, 10, 80, 100, "125-250", 80, "Erstschlag", [FLANK, SPLASH]),
    {
        ...g("jungerer-zwillingsgeneral", "Jüngerer Zwillingsgeneral", "Verteidigungseinheiten: +10 % Treffsicherheit und Flankenangriff.", 140, 15, 10, 120, 2000, "4500-5000", 90, "Normal", [FLANK, SPLASH]),
        garrison: "b_halloween2019_garrison",
        skills: [
            { icon: "lightning_slash2", level: 0, max: 1 },
            { icon: "master_planner", level: 0, max: 1 },
            { icon: "bounty_hunter", label: "Kopfgeldjäger", level: 0, max: 1 },
            { icon: "1-up", label: "Extraleben", level: 1, max: 1 },
            { icon: "cleave", level: 0, max: 3 },
            { icon: "weekly_maintenance", level: 0, max: 3 },
            { icon: "garrison_annex", level: 3, max: 3 },
            { icon: "confident_leader", level: 2, max: 3 },
            { icon: "unstoppable_charge3", level: 0, max: 3 },
            { icon: "battle_frenzy", label: "Kampfrausch", level: 0, max: 3 },
            { icon: "fast_learner", level: 3, max: 3 },
            { icon: "just_a_flesh_wound", label: "Nur eine Fleischwunde", level: 0, max: 3 },
            { icon: "sniper training_new", level: 0, max: 3 },
            { icon: "overrun2", level: 0, max: 3 },
            { icon: "hostile_takeover", level: 3, max: 3 },
            { icon: "navigation_crash_course", level: 3, max: 3 },
            { icon: "rapid_fire", level: 0, max: 3 },
            { icon: "jaggernaut", level: 0, max: 3 },
            { icon: "first_aid", level: 3, max: 3 },
            { icon: "jog", level: 3, max: 3 },
        ],
        origin: [
            "Kaufmann: 9× à 6.999 Edelsteine",
            "Halloween-Event, Kaufmann (2020–2026): 1× à 6.999 Kürbisse",
            "Verstärkungspaket: 12.999 Edelsteine",
            "Militärpaket (Valentins-Event 2021–2023): 18.199 Edelsteine",
            "Halloween-Elite-Paket (2020–2022): 25.999 Edelsteine",
            "Halloween-Generäle-Paket (2020–2022): 16.999 Kürbisse oder 16.666 Edelsteine",
            "Szenario-Paket I (Szenario-Saison 2024): 25.999 Edelsteine",
            "Unternehmungspaket III (Saison 2025): 9.999 Edelsteine",
        ],
    },
    g("narzisstische-generalin", "Narzisstische Generalin", "Gegnerische Bosse: −25 % Leben. Steht nach der ersten Niederlage je Abenteuer sofort wieder auf. −80 % Erfahrung durch besiegte Gegner. Lootbox „Truhe der besten aller Heldentaten“ pro 1000 Erfahrung. Verkürzte Erholungszeit.", 10, 10, 7, 60, 250, "5400-6000", 85, "Erstschlag", [FLANK]),
    g("geister-generalin", "Geister-Generalin", "Eigene Einheiten: +20 % Leben. Gegnerische Treffsicherheit halbiert. Stellt 20 % der Verluste wieder her, steht nach der ersten Niederlage je Abenteuer sofort wieder auf, verkürzte Erholungszeit.", 215, 10, 7, 60, 2, "777-999", 85, "Letzter Angriff", [FLANK, SPLASH]),
    g("entschlossener-general", "Entschlossener General", "Soldaten, Elitesoldaten, Schwertkämpfer: +100 % Leben, −30 % Schaden, Flächenschaden. Einheiten: +50 % Schaden nach jeder Runde. Gegnerische Angriffs- und Schwere Einheiten: −30 % Schaden; Gegner können keinen Flankenangriff einsetzen.", 200, 15, 10, 120, 3000, "400-600", 85, "Normal", [SPLASH]),
    g("frostiger-general", "Frostiger General", "Verteidigungseinheiten: +30 % Schaden und Flächenschaden.", 190, 15, 10, 120, 2412, "2412-2612", 24, "Normal", [SPLASH]),
    g("einsamer-general", "Einsamer General", "Stellt nach jedem Kampf 10 % der Verluste wieder her. Angriffseinheiten: +50 % Schaden.", 230, 15, 10, 120, 500, "500-2000", 95, "Erstschlag", [SPLASH]),
    g("vermummter-general", "Vermummter General", "Gegnerische Bosse: −25 % Leben und −25 % Schaden. Gegnerische Verteidigungseinheiten: −25 % Leben.", 200, 10, 7, 80, 1000, "500-5000", 10, "Erstschlag", [SPLASH]),
    g("standhafte-generalin", "Standhafte Generalin", "Schnelle Einheiten: +20 % Schaden, +20 % Treffsicherheit, Flankenangriff und Flächenschaden.", 220, 15, 10, 120, 10000, "100-200", 70, "Normal", [FLANK, SPLASH]),
    g("brohmann-der-reiter", "Brohmann, der Reiter", "Reiterei und Ritter: +30 Schaden. Ritter erhalten Flankenangriff. Lootbox „Schatz der Reiter“ pro 450 Erfahrung.", 125, 7.5, 5, 60, 500, "1500-3000", 70, "Erstschlag", [FLANK, SPLASH]),
    g("general-boris", "General Boris", "Schnelle Einheiten: +50 % Schaden. Gegnerische schnelle Einheiten: −50 % Schaden. +50 % Erfahrung durch besiegte Gegner.", 180, 15, 10, 120, 100, "700-1000", 80, "Erstschlag", [FLANK, SPLASH]),
    g("generalin-sylvana", "Generalin Sylvana", "Schnelle Einheiten: +50 % Schaden. Gegnerische schnelle Einheiten: −50 % Schaden. +50 % Erfahrung durch besiegte Gegner.", 180, 15, 10, 120, 100, "700-1000", 80, "Erstschlag", [FLANK, SPLASH]),
    g("general-juan", "General Juan", "Stellt nach jedem Kampf 20 % der Verluste wieder her. +100 % Erfahrung durch besiegte Gegner.", 180, 15, 10, 120, 500, "700-800", 80, "Erstschlag", [FLANK, SPLASH]),
    g("generalin-mary-christmas", "Generalin Mary Christmas", "+100 % Erfahrung durch besiegte Gegner.", 200, 15, 10, 120, 100, "125-250", 80, "Normal"),
    g("general-zitterbart", "General Zitterbart", "+200 % Erfahrung durch besiegte Gegner. 1 Sterntaler pro 1000 Erfahrung (stapelt sich nicht mit Kopfgeldjäger).", 160, 15, 10, 120, 1, "375-425", 90, "Erstschlag", [FLANK, SPLASH]),
    g("generalin-grossmaul", "Generalin Großmaul", "Gegner: −10 % Schaden und kein Flankenangriff. Verkürzte Erholungszeit.", 170, 15, 10, 80, 300, "800-1100", 80, "Erstschlag"),
    g("verruckter-wissenschaftler", "Verrückter Wissenschaftler", "Schwere Einheiten: +100 % Schaden.", 200, 15, 10, 120, 1, "300-600", 60, "Letzter Angriff", ["Abreißen", SPLASH]),
    g("meister-der-kampfkunst", "Meister der Kampfkunst", "", 220, 15, 10, 120, 1, "450-500", 80, "Erstschlag", [SPLASH, FLANK]),
    g("nussknacker-general", "Nussknacker-General", "Einheiten: +30 % Leben. Stellt nach jedem Kampf 20 % der Verluste wieder her.", 200, 15, 10, 120, 3000, "500-2000", 70, "Normal", [FLANK]),
    g("wundergeneralin", "Wundergeneralin", "Stellt nach jedem Kampf 45 % der Verluste wieder her. Steht nach der ersten Niederlage je Abenteuer sofort wieder auf.", 200, 15, 10, 120, 300, "400-800", 80, "Letzter Angriff"),
    g("feldsanitatergeneral", "Feldsanitätergeneral", "Stellt nach jedem Kampf 30 % der Verluste wieder her.", 200, 15, 10, 120, 100, "120-120", 80, "Normal"),
    g("verteidigungsmeister", "Verteidigungsmeister", "", 200, 15, 10, 120, 5000, "25-50", 80, "Normal", [FLANK, SPLASH]),
    g("champion-vargus", "Champion Vargus", "Gegner: −5 % Schaden und kein Flankenangriff.", 180, 15, 10, 120, 200, "750-1250", 80, "Erstschlag", [SPLASH]),
    g("champion-anslem", "Champion Anslem", "Gegnerische Einheiten: 0 % Treffsicherheit.", 150, 15, 10, 120, 150, "1000-1500", 50, "Normal", [SPLASH, FLANK]),
    g("champion-nusala", "Champion Nusala", "Angriffseinheiten: Flächenschaden und Flankenangriff.", 165, 15, 10, 120, 150, "1000-1500", 90, "Erstschlag", [SPLASH, FLANK]),
    g("kampfgestahlter-general", "Kampfgestählter General", "", 200, 15, 10, 120, 1, "120-120", 80, "Normal"),
    g("general-grosshelm", "General Großhelm", "", 200, 15, 10, 120, 1, "120-120", 80, "Normal"),
    g("sensenmann-general", "Sensenmann General", "", 200, 15, 10, 120, 1, "120-120", 80, "Normal"),
    g("general-klotz", "General Klotz", "", 220, 15, 10, 120, 1, "120-120", 80, "Normal"),
    g("furst-dracul", "Fürst Dracul", "", 200, 15, 10, 120, 999, "111-333", 77, "Erstschlag", [SPLASH]),
];
function e(slug, name, speed, special = "") {
    return { slug, name, speed, special };
}
export const EXPLORERS = [
    e("entdecker", "Entdecker", 100, "Erkundet neue Sektoren und sucht nach Schätzen, Abenteuern und Expeditionen."),
    e("wilder-kundschafter", "Wilder Kundschafter", 200),
    e("erfahrener-entdecker", "Erfahrener Entdecker", 200),
    e("entzuckende-entdeckerin", "Entzückende Entdeckerin", 200, "Findet auf Schatz- und Raritätensuchen immer die höchstmögliche Rohstoffmenge."),
    e("erfolgreicher-entdecker", "Erfolgreicher Entdecker", 300, "Chance auf eine Förderung bei Schatz-, Artefakt-, Raritäten- und Abenteuersuchen."),
    e("abenteuerliche-entdeckerin", "Abenteuerliche Entdeckerin", 400, "+50 % Belohnungen auf Schatz-, Artefakt- und Raritätensuchen. −50 % Kosten für Abenteuersuchen."),
    e("forscher-entdecker", "Forscher Entdecker", 250, "+50 % Belohnungen auf Schatz-, Artefakt- und Raritätensuchen. Findet dabei auch Förderungen."),
    e("mutige-entdeckerin", "Mutige Entdeckerin", 200, "Doppelte Belohnung auf Schatz-, Artefakt- und Raritätensuchen."),
    e("emphatisch-entdeckerin", "Emphatisch Entdeckerin", 200, "Dreifache Belohnung auf Schatz-, Artefakt- und Raritätensuchen."),
    e("verzaubernde-entdeckerin", "Verzaubernde Entdeckerin", 200, "Doppelte Belohnung auf Schatz-, Artefakt- und Raritätensuchen und immer die höchstmögliche Rohstoffmenge auf Schatz- und Raritätensuchen."),
    e("mutterliche-entdeckerin", "Mütterliche Entdeckerin", 100, "Vierfache Belohnung auf Schatz-, Artefakt- und Raritätensuchen."),
    e("freimutiger-entdecker", "Freimütiger Entdecker", 100, "Vierfache Belohnung auf Schatz-, Artefakt- und Raritätensuchen."),
    e("bescheidener-entdecker", "Bescheidener Entdecker", 100, "Sechsfache Belohnung auf kurzen und mittleren Schatzsuchen."),
    e("romantischer-entdecker", "Romantischer Entdecker", 50, "Zwölffache Belohnung auf langen, sehr langen und ausgedehnten Schatzsuchen."),
    e("unerschrockene-entdeckerin", "Unerschrockene Entdeckerin", 200, "Doppelte Belohnung auf Abenteuersuchen."),
    e("kuhne-entdeckerin", "Kühne Entdeckerin", 200, "Dreifache Belohnung auf Abenteuersuchen."),
    e("schnee-entdecker", "Schnee-Entdecker", 200, "Doppelte Belohnung auf Schatz-, Artefakt- und Raritätensuchen, vierfache für Event-Ressourcen auf Schatzsuchen."),
    e("puscheliger-entdecker", "Puscheliger Entdecker", 300, "Fünffache Belohnung für Event-Ressourcen auf Schatzsuchen."),
    e("piraten-entdecker", "Piraten-Entdecker", 50, "Findet auf Schatzsuchen Goldmünzen, Waffen oder Premium-Tage. +100 % Belohnungen auf Schatzsuchen."),
    e("prinzessin-zoe", "Prinzessin Zoe", 300, "Findet auf Abenteuersuchen eine Förderung. Chance auf Förderung und/oder Abenteuer bei Schatz-, Artefakt- und Raritätensuchen."),
    e("schreckhafter-entdecker", "Schreckhafter Entdecker", 25, "Vierfache Belohnung auf Schatzsuchen. Geringe Chance auf Kristalle, Premium-Tage oder Bücher."),
    e("wohltatige-entdeckerin", "Wohltätige Entdeckerin", 200, "Findet auf sehr langen und ausgedehnten Schatzsuchen eine Förderung (gelegentlich einen Medizinkoffer)."),
    e("koniglicher-entdecker", "Königlicher Entdecker", 400, "Chance, auf Abenteuersuchen Marken zu finden."),
    e("rina-die-entdeckerin", "Rina, die Entdeckerin", 400, "Chance auf ein Abenteuer bei Schatz-, Artefakt- und Raritätensuchen."),
    e("verliebter-entdecker", "Verliebter Entdecker", 50, "Findet auf Abenteuersuchen immer Ölsamen."),
    e("schwarzbaum-entdeckerin", "Schwarzbaum-Entdeckerin", 100, "Chance auf Schwarzbaum-Förderungen bei langen, sehr langen und ausgedehnten Schatzsuchen."),
    e("gesellige-entdeckerin", "Gesellige Entdeckerin", 200, "Chance auf Schokoladen-Belohnungen bei langen, sehr langen und ausgedehnten Schatzsuchen."),
    e("geistentdecker", "Geistentdecker", 100, "Chance auf Halloween-Förderungen auf Schatzsuchen."),
    e("nora-die-entdeckerin", "Nora die Entdeckerin", 200, "200 % Tempo auf Abenteuersuchen, 67 % auf Schatzsuchen. Geringe Chance auf ein zusätzliches Märchen-Abenteuer."),
];
//# sourceMappingURL=specialists.js.map
// Lädt alle Skill-Icons und Garnison-Bilder einmalig von tsowiki.eu nach assets/img/
// und bindet sie damit lokal ein (keine IP-Übertragung an tsowiki.eu beim Seitenaufruf).
// Aufruf:  npm run build && npm run icons      (Node 18+, bereits vorhandene Dateien werden übersprungen)
// Hinweis: Die Grafiken stammen aus dem Spiel (© Ubisoft), tsowiki.eu betreibt sie als Fan-Wiki.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.join(__dirname, "..");
const SKILL_DIR = path.join(ROOT, "assets", "img", "skill-icons");
const GARRISON_DIR = path.join(ROOT, "assets", "img", "garrisons");
const BASE = "https://tsowiki.eu";

async function loadModule(name) {
    // Projekt ist "commonjs", die kompilierten Dateien sind ES-Module -> Kopie mit "type": "module"
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "icons-"));
    fs.writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}');
    fs.copyFileSync(path.join(ROOT, "js", "data", name), path.join(tmp, name));
    return import(pathToFileURL(path.join(tmp, name)).href);
}

async function download(url, target) {
    if (fs.existsSync(target) && fs.statSync(target).size > 0) {
        return "vorhanden";
    }
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
    fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    return "geladen";
}

(async () => {
    const { SKILL_TREES, iconFileName } = await loadModule("skill-trees.js");
    const { GENERALS } = await loadModule("specialists.js");

    fs.mkdirSync(SKILL_DIR, { recursive: true });
    fs.mkdirSync(GARRISON_DIR, { recursive: true });

    const jobs = [];
    const icons = new Set();

    for (const tree of Object.values(SKILL_TREES)) {
        tree.forEach((slot) => icons.add(slot.icon));
    }
    // Auch Icons aus den Beispiel-Skillungen einzelner Generäle (falls abweichend)
    GENERALS.forEach((g) => (g.skills ?? []).forEach((tile) => icons.add(tile.icon)));

    icons.forEach((icon) => {
        jobs.push([`${BASE}/icons/skills/${encodeURIComponent(icon)}.webp`, path.join(SKILL_DIR, iconFileName(icon))]);
    });
    GENERALS.filter((g) => g.garrison).forEach((g) => {
        jobs.push([
            `${BASE}/images/buildings/${encodeURIComponent(g.garrison)}.webp`,
            path.join(GARRISON_DIR, `${g.garrison}.webp`),
        ]);
    });

    let failed = 0;
    for (const [url, target] of jobs) {
        try {
            const state = await download(url, target);
            console.log(state.padEnd(9), path.relative(ROOT, target));
        } catch (error) {
            failed++;
            console.error("FEHLER   ", path.relative(ROOT, target), `(${error.message})`);
        }
    }

    console.log(`\n${jobs.length - failed} von ${jobs.length} Dateien bereit.`);
    process.exit(failed > 0 ? 1 : 0);
})();

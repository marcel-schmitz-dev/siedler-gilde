// Prüft, dass kein Kürzel (Avatar) doppelt vergeben ist und jede Einheit eins hat.
// Aufruf: npm run build && npm run check:abbr   (liest die kompilierten Dateien aus js/)
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
    // Das Projekt ist "commonjs", die kompilierten Dateien sind aber ES-Module.
    // Deshalb eine Kopie in einem Temp-Ordner mit "type": "module" laden.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "abbr-check-"));
    fs.writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}');
    fs.copyFileSync(path.join(__dirname, "..", "js", "data", "specialists.js"), path.join(tmp, "specialists.js"));
    const file = pathToFileURL(path.join(tmp, "specialists.js")).href;
    const { GENERALS, EXPLORERS, GEOLOGISTS } = await import(file);
    const all = [...GENERALS, ...EXPLORERS, ...GEOLOGISTS];
    const seen = new Map();
    let errors = 0;

    for (const unit of all) {
        if (!unit.abbr || unit.abbr === "?") {
            console.error(`Kein Kürzel: ${unit.name} (${unit.slug})`);
            errors++;
            continue;
        }
        const key = unit.abbr.toUpperCase();
        if (seen.has(key)) {
            console.error(`Doppeltes Kürzel ${key}: ${seen.get(key)} und ${unit.name}`);
            errors++;
        } else {
            seen.set(key, unit.name);
        }
    }

    if (errors > 0) {
        process.exit(1);
    }
    console.log(`OK: ${all.length} Einheiten, alle Kürzel eindeutig.`);
})();

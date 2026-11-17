// Erzeugt den Upload-Ordner dist/ für den IONOS-Webspace.
// Aufruf: npm run deploy   (baut vorher html, sass und ts)
//
// dist/ enthält nur, was der Server wirklich braucht:
//   index.html, die vier Rechtsseiten, css/, js/, assets/ (und .htaccess, falls vorhanden).
// Nicht enthalten: node_modules, src, scss, ts, scripts, docs, .git, package.json usw.
//
// Danach den INHALT von dist/ per SFTP in das Web-Verzeichnis der Domain hochladen.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const FILES = [
    "index.html",
    "impressum.html",
    "datenschutz.html",
    "privacy.html",
    "haftungsausschluss.html",
    ".htaccess", // optional
];

const FOLDERS = ["css", "js", "assets"];

// Source-Maps werden online nicht gebraucht und bleiben draußen
const skipMaps = (source) => !source.endsWith(".map");

function fail(message) {
    console.error(`\nFEHLER: ${message}\n`);
    process.exit(1);
}

// --- Prüfungen vor dem Kopieren ---

for (const file of FILES) {
    if (file !== ".htaccess" && !fs.existsSync(path.join(ROOT, file))) {
        fail(`${file} fehlt. Bitte zuerst "npm run build" ausführen.`);
    }
}

for (const folder of FOLDERS) {
    if (!fs.existsSync(path.join(ROOT, folder))) {
        fail(`Ordner ${folder}/ fehlt.`);
    }
}

if (!fs.existsSync(path.join(ROOT, "js", "vendor", "supabase.js"))) {
    fail("js/vendor/supabase.js fehlt. Bitte einmal \"npm run vendor\" ausführen.");
}

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
if (!indexHtml.includes("AUTOMATISCH ERZEUGT")) {
    fail("index.html wurde nicht aus src/ erzeugt. Bitte \"npm run html\" ausführen.");
}

// --- dist/ neu aufbauen ---

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const file of FILES) {
    const source = path.join(ROOT, file);
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(DIST, file));
    }
}

for (const folder of FOLDERS) {
    fs.cpSync(path.join(ROOT, folder), path.join(DIST, folder), {
        recursive: true,
        filter: skipMaps,
    });
}

// --- Zusammenfassung ---

function countFiles(dir) {
    let count = 0;
    let bytes = 0;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const inner = countFiles(full);
            count += inner.count;
            bytes += inner.bytes;
        } else {
            count += 1;
            bytes += fs.statSync(full).size;
        }
    }

    return { count, bytes };
}

const { count, bytes } = countFiles(DIST);

console.log(`dist/ erstellt: ${count} Dateien, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
console.log("Jetzt den Inhalt von dist/ per SFTP in das Web-Verzeichnis hochladen.");

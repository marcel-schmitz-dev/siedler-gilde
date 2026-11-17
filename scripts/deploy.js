// Erzeugt bzw. aktualisiert den Upload-Ordner dist/ für den IONOS-Webspace.
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

// --- dist/ abgleichen ---
// dist/ wird nicht gelöscht, sondern abgeglichen: Eine Datei wird nur dann neu
// geschrieben, wenn sich ihr Inhalt geändert hat. So behalten unveränderte Dateien
// ihren Zeitstempel, und das SFTP-Programm lädt nur das wirklich Geänderte hoch.

fs.mkdirSync(DIST, { recursive: true });

const wanted = new Set(); // alle Dateien, die in dist/ sein sollen (relativ)
let changed = 0;
let unchanged = 0;
let removed = 0;

function syncFile(sourceFile, relativePath) {
    const target = path.join(DIST, relativePath);
    wanted.add(relativePath);

    fs.mkdirSync(path.dirname(target), { recursive: true });

    if (fs.existsSync(target) && fs.readFileSync(sourceFile).equals(fs.readFileSync(target))) {
        unchanged += 1;
        return;
    }

    fs.copyFileSync(sourceFile, target);
    changed += 1;
    console.log(`  geändert: ${relativePath}`);
}

function syncFolder(sourceDir, relativeDir) {
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const relativePath = path.join(relativeDir, entry.name);

        if (entry.isDirectory()) {
            syncFolder(sourcePath, relativePath);
        } else if (skipMaps(sourcePath)) {
            syncFile(sourcePath, relativePath);
        }
    }
}

for (const file of FILES) {
    const source = path.join(ROOT, file);
    if (fs.existsSync(source)) {
        syncFile(source, file);
    }
}

for (const folder of FOLDERS) {
    syncFolder(path.join(ROOT, folder), folder);
}

// Dateien, die es im Projekt nicht mehr gibt, auch aus dist/ entfernen
function cleanFolder(dir, relativeDir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const relativePath = path.join(relativeDir, entry.name);

        if (entry.isDirectory()) {
            cleanFolder(full, relativePath);

            if (fs.readdirSync(full).length === 0) {
                fs.rmdirSync(full);
            }
        } else if (!wanted.has(relativePath)) {
            fs.unlinkSync(full);
            removed += 1;
            console.log(`  entfernt: ${relativePath}`);
        }
    }
}

cleanFolder(DIST, "");

// --- Zusammenfassung ---

console.log(`\ndist/ ist aktuell: ${changed} geändert, ${removed} entfernt, ${unchanged} unverändert.`);

if (changed === 0 && removed === 0) {
    console.log("Es gibt nichts Neues hochzuladen.");
} else {
    console.log("Jetzt die geänderten Dateien aus dist/ per SFTP hochladen (siehe README).");
    console.log("Entfernte Dateien müssen auf dem Server von Hand gelöscht werden.");
}

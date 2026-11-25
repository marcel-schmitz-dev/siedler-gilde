// Macht aus den großen Original-Karten (PNG/WebP mit Transparenz) schlanke Vorlagen für die Taktikkarten.
//
// Ablauf:
//   1. einmalig: npm install -D sharp
//   2. Originale nach vorlagen-original/<reiter>/ legen, z. B. vorlagen-original/maerchen/Ali Baba gross.png
//      (Reiter: klassisch, maerchen, szenario, unternehmungen, koop)
//   3. npm run templates
//   4. die ausgegebenen Zeilen in ts/data/map-templates.ts einfügen und die Titel prüfen

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE = path.join(__dirname, "..", "vorlagen-original");
const TARGET = path.join(__dirname, "..", "assets", "img_vorlagen");
const CATEGORIES = ["klassisch", "maerchen", "szenario", "unternehmungen", "koop"];
const MAX_SIZE = 2400;
const THUMB_WIDTH = 480;
const MAX_BYTES = 2.5 * 1024 * 1024;

function slugify(name) {
    return name
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function listImages() {
    const files = [];

    if (!fs.existsSync(SOURCE)) {
        return files;
    }

    for (const entry of fs.readdirSync(SOURCE, { withFileTypes: true })) {
        const folder = entry.isDirectory() ? entry.name : "";
        const names = folder ? fs.readdirSync(path.join(SOURCE, folder)) : [entry.name];

        for (const name of names) {
            if (/\.(png|webp)$/i.test(name)) {
                files.push({ category: CATEGORIES.includes(folder) ? folder : "klassisch", file: path.join(SOURCE, folder, name), name });
            }
        }
    }

    return files;
}

async function convert(file, target) {
    for (const quality of [82, 72, 62, 52]) {
        await sharp(file)
            .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "inside", withoutEnlargement: true })
            .webp({ quality, alphaQuality: 90 })
            .toFile(target);

        if (fs.statSync(target).size <= MAX_BYTES) {
            return quality;
        }
    }

    return 52;
}

async function main() {
    const images = listImages();

    if (!images.length) {
        console.log("Keine Bilder gefunden. Lege PNG oder WebP in vorlagen-original/<reiter>/ ab.");
        return;
    }

    fs.mkdirSync(TARGET, { recursive: true });

    const lines = [];

    for (const image of images) {
        const base = image.name.replace(/\.[^.]+$/, "");
        const id = slugify(base);
        const target = path.join(TARGET, `${id}.webp`);
        const thumb = path.join(TARGET, `${id}-thumb.webp`);

        const quality = await convert(image.file, target);

        await sharp(image.file)
            .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
            .webp({ quality: 80, alphaQuality: 90 })
            .toFile(thumb);

        const kb = Math.round(fs.statSync(target).size / 1024);

        console.log(`${image.name} -> ${id}.webp (${kb} KB, Qualität ${quality})`);

        lines.push(
            `    { id: "${id}", title: "${base.replace(/[-_]+/g, " ")}", category: "${image.category}", image: "./assets/img_vorlagen/${id}.webp", thumb: "./assets/img_vorlagen/${id}-thumb.webp" },`
        );
    }

    console.log("\nIn ts/data/map-templates.ts einfügen:\n");
    console.log(lines.join("\n"));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});

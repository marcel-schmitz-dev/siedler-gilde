// Baut die index.html aus src/index.html und den Teilen in src/partials/.
// Aufruf: npm run html
//
// In einer Datei steht an der Stelle, wo ein Teil hin soll, eine Zeile wie:
//     <!-- @include partials/home/hero.html -->
// Das Skript ersetzt sie durch den Inhalt der Datei (auch verschachtelt)
// und rückt den Inhalt passend zur Einrückung der Zeile ein.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const OUT = path.join(__dirname, "..", "index.html");
const MARKER = /^([ \t]*)<!--\s*@include\s+(\S+)\s*-->\s*$/;

function render(file, stack = []) {
    if (stack.includes(file)) {
        throw new Error(`Endlose Verschachtelung: ${[...stack, file].join(" -> ")}`);
    }

    const lines = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
    const result = [];

    for (const line of lines) {
        const match = line.match(MARKER);

        if (!match) {
            result.push(line);
            continue;
        }

        const [, indent, relative] = match;
        const target = path.join(SRC, relative);

        if (!fs.existsSync(target)) {
            throw new Error(`Teil nicht gefunden: src/${relative} (in ${path.relative(SRC, file)})`);
        }

        const inner = render(target, [...stack, file]).replace(/\n+$/, "").split("\n");

        for (const innerLine of inner) {
            result.push(innerLine.trim() === "" ? "" : indent + innerLine);
        }
    }

    return result.join("\n");
}

const banner =
    "<!-- AUTOMATISCH ERZEUGT aus src/index.html und src/partials/.\n" +
    "     Nicht hier ändern, sondern in src/ und danach: npm run html -->\n";

const html = render(path.join(SRC, "index.html")).replace(/\n*$/, "\n");
const output = html.replace(/^(<!doctype html>\n)/i, `$1${banner}`);

fs.writeFileSync(OUT, output, "utf8");

console.log(`index.html erzeugt (${output.split("\n").length - 1} Zeilen)`);

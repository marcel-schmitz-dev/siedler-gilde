import { MAP_CATEGORIES } from "./data/adventure-maps.js";
import type { MapCategoryId } from "./data/adventure-maps.js";
import { MAP_TEMPLATES, findTemplate } from "./data/map-templates.js";
import type { MapTemplate } from "./data/map-templates.js";
import { esc, openDialog } from "./dom.js";
import { LIMITS, createFromTemplate, createMap } from "./tactic-store.js";

const MAX_SOURCE = 30 * 1024 * 1024;
const MAX_WIDTH = 3000;
const MAX_HEIGHT = 3000;
const MAX_PIXELS = 100_000_000;
const TARGET_BYTES = 3 * 1024 * 1024;
const HARD_BYTES = 4.8 * 1024 * 1024;
const THUMB_WIDTH = 480;

interface Converted {
    image: Blob;
    thumb: Blob;
    width: number;
    height: number;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function drawScaled(bitmap: ImageBitmap, width: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width));

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d")!;

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    return canvas;
}

function hasTransparency(bitmap: ImageBitmap): boolean {
    const canvas = drawScaled(bitmap, 96);
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 250) {
            return true;
        }
    }

    return false;
}

function groupOf(template: MapTemplate): string {
    return template.group ?? "Weitere";
}

function templateOptions(): string {
    const groups: string[] = [];

    MAP_TEMPLATES.forEach((template) => {
        if (!groups.includes(groupOf(template))) {
            groups.push(groupOf(template));
        }
    });

    return groups
        .map(
            (group) =>
                `<optgroup label="${esc(group)}">${MAP_TEMPLATES.filter((template) => groupOf(template) === group)
                    .map((template) => `<option value="${esc(template.id)}">${esc(template.title)}</option>`)
                    .join("")}</optgroup>`
        )
        .join("");
}

function formatSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

async function convert(file: File): Promise<Converted> {
    if (file.type !== "image/png" && file.type !== "image/webp") {
        throw new Error("Bitte wähle ein PNG oder WebP.");
    }

    if (file.size > MAX_SOURCE) {
        throw new Error(`Die Datei ist mit ${formatSize(file.size)} zu groß (höchstens 30 MB).`);
    }

    let bitmap: ImageBitmap;

    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new Error("Das Bild konnte nicht gelesen werden.");
    }

    if (bitmap.width * bitmap.height > MAX_PIXELS) {
        throw new Error("Das Bild hat zu viele Pixel. Bitte verkleinere es vorher.");
    }

    if (!hasTransparency(bitmap)) {
        throw new Error("Das Bild hat keinen transparenten Hintergrund. Gebraucht wird nur die Insel ohne Meer.");
    }

    let width = Math.min(bitmap.width, MAX_WIDTH, Math.round((MAX_HEIGHT * bitmap.width) / bitmap.height));
    let quality = 0.92;
    let image: Blob | null = null;
    let webp = true;

    for (let round = 0; round < 14; round += 1) {
        const canvas = drawScaled(bitmap, width);
        const blob = await toBlob(canvas, webp ? "image/webp" : "image/png", quality);

        if (!blob) {
            throw new Error("Das Bild konnte nicht umgewandelt werden.");
        }

        if (webp && blob.type !== "image/webp") {
            // Browser ohne WebP-Export (z. B. Safari): PNG und stattdessen die Breite verkleinern
            webp = false;
            round -= 1;
            continue;
        }

        const limit = webp ? TARGET_BYTES : HARD_BYTES;

        if (blob.size <= limit) {
            image = blob;
            width = canvas.width;
            break;
        }

        if (webp && quality > 0.6) {
            quality -= 0.1;
        } else {
            width = Math.round(width * 0.85);
        }
    }

    if (!image) {
        throw new Error("Das Bild lässt sich nicht klein genug umwandeln. Bitte verkleinere es vorher.");
    }

    const thumbCanvas = drawScaled(bitmap, Math.min(THUMB_WIDTH, bitmap.width));
    const thumb = await toBlob(thumbCanvas, image.type, 0.8);

    if (!thumb) {
        throw new Error("Die Vorschau konnte nicht erstellt werden.");
    }

    const ratio = bitmap.height / bitmap.width;

    bitmap.close();

    return { image, thumb, width, height: Math.round(width * ratio) };
}

export function openUploadDialog(category: MapCategoryId, admin: boolean, onCreated: (id: string) => void): void {
    const dialog = openDialog(
        `
        <header class="dlg-head dlg-head--simple">
            <div>
                <h3>Neue Taktikkarte hinzufügen</h3>
                <p class="dlg-note">Wähle eine Vorlage aus der Liste der Abenteuer oder lade eine eigene Karte hoch.</p>
            </div>
        </header>

        <div class="upload-form">
            ${
                MAP_TEMPLATES.length
                    ? `<div class="upload-mode" role="group" aria-label="Quelle der Karte">
                        <button type="button" data-mode="template" class="is-active" aria-pressed="true">Aus Vorlage</button>
                        <button type="button" data-mode="file" aria-pressed="false">Eigene Datei</button>
                    </div>`
                    : ""
            }

            <label class="view-field">
                <span>Name der Taktikkarte</span>
                <input type="text" id="up-title" minlength="${LIMITS.title.min}" maxlength="${LIMITS.title.max}" autocomplete="off" />
            </label>

            <label class="view-field">
                <span>Reiter</span>
                <select id="up-category">
                    ${MAP_CATEGORIES.map(
                        (item) => `<option value="${item.id}"${item.id === category ? " selected" : ""}>${esc(item.title)}</option>`
                    ).join("")}
                </select>
            </label>

            <label class="view-field" id="up-template-box">
                <span>Abenteuer</span>
                <select id="up-template">
                    ${templateOptions()}
                </select>
            </label>

            <label class="view-field" id="up-file-box">
                <span>Bilddatei (nur die Insel als transparentes PNG oder WebP, bis 30 MB)</span>
                <input type="file" id="up-file" accept="image/png,image/webp" />
            </label>

            <div class="upload-preview" id="up-preview" hidden></div>

            <p class="wiz-message" id="up-message" role="alert"></p>

            <p class="dlg-note">${
                admin
                    ? "Als Admin wird deine Karte sofort freigegeben."
                    : "Neue Karten sind zuerst nur für dich und den Admin sichtbar, bis sie freigegeben werden."
            } Mit dem Hochladen bestätigst du, dass du die Karte verwenden darfst.</p>

            <div class="dlg-actions">
                <button type="button" class="wiz-button" id="up-save" disabled>Hochladen</button>
                <button type="button" class="wiz-button wiz-button--ghost" data-dialog-close>Abbrechen</button>
            </div>
        </div>`,
        "member-dialog--wide"
    );

    const title = dialog.querySelector<HTMLInputElement>("#up-title")!;
    const select = dialog.querySelector<HTMLSelectElement>("#up-category")!;
    const fileInput = dialog.querySelector<HTMLInputElement>("#up-file")!;
    const preview = dialog.querySelector<HTMLElement>("#up-preview")!;
    const message = dialog.querySelector<HTMLElement>("#up-message")!;
    const save = dialog.querySelector<HTMLButtonElement>("#up-save")!;

    const templateBox = dialog.querySelector<HTMLElement>("#up-template-box")!;
    const fileBox = dialog.querySelector<HTMLElement>("#up-file-box")!;
    const templateSelect = dialog.querySelector<HTMLSelectElement>("#up-template")!;

    let mode: "template" | "file" = MAP_TEMPLATES.length ? "template" : "file";
    let lastTemplateTitle = "";
    let converted: Converted | null = null;
    let previewUrl = "";
    let run = 0;

    function clearPreview(): void {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = "";
        }

        preview.hidden = true;
        preview.innerHTML = "";
    }

    function updateButton(): void {
        const ready = mode === "template" ? Boolean(findTemplate(templateSelect.value)) : Boolean(converted);

        save.disabled = !ready || title.value.trim().length < LIMITS.title.min;
    }

    function showTemplate(): void {
        const template = findTemplate(templateSelect.value);

        clearPreview();

        if (!template) {
            return;
        }

        if (!title.value.trim() || title.value === lastTemplateTitle) {
            title.value = template.title;
        }

        lastTemplateTitle = template.title;
        select.value = template.category;
        preview.hidden = false;
        preview.innerHTML = `<img src="${esc(template.thumb ?? template.image)}" alt="Vorschau der Vorlage" />`;
        updateButton();
    }

    function setMode(next: "template" | "file"): void {
        mode = next;
        templateBox.hidden = next !== "template";
        fileBox.hidden = next !== "file";
        message.textContent = "";
        dialog.querySelectorAll<HTMLButtonElement>(".upload-mode button").forEach((button) => {
            const active = button.dataset.mode === next;

            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        if (next === "template") {
            showTemplate();
        } else {
            clearPreview();
            converted = null;
            fileInput.value = "";
        }

        updateButton();
    }

    dialog.querySelectorAll<HTMLButtonElement>(".upload-mode button").forEach((button) => {
        button.addEventListener("click", () => setMode(button.dataset.mode as "template" | "file"));
    });

    templateSelect.addEventListener("change", showTemplate);

    dialog.addEventListener("close", clearPreview, { once: true });

    title.addEventListener("input", updateButton);

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        const current = ++run;

        converted = null;
        clearPreview();
        updateButton();
        message.textContent = "";

        if (!file) {
            return;
        }

        message.textContent = "Bild wird umgewandelt …";

        try {
            const result = await convert(file);

            if (current !== run) {
                return;
            }

            converted = result;
            previewUrl = URL.createObjectURL(result.thumb);
            preview.hidden = false;
            preview.innerHTML = `<img src="${previewUrl}" alt="Vorschau der Karte" /><p>${result.width} × ${result.height} px, ${formatSize(result.image.size)}</p>`;
            message.textContent = "";
        } catch (error) {
            if (current === run) {
                message.textContent = error instanceof Error ? error.message : "Das Bild konnte nicht verarbeitet werden.";
                fileInput.value = "";
            }
        }

        updateButton();
    });

    setMode(mode);

    save.addEventListener("click", async () => {
        const name = title.value.trim();

        if (mode === "template") {
            if (name.length < LIMITS.title.min) {
                message.textContent = `Gib einen Namen mit mindestens ${LIMITS.title.min} Zeichen an.`;
                return;
            }

            save.disabled = true;
            message.textContent = "Wird angelegt …";

            const created = await createFromTemplate({
                category: select.value as MapCategoryId,
                title: name,
                template: templateSelect.value,
            });

            if (created.error || !created.id) {
                message.textContent = created.error ?? "Das hat nicht geklappt.";
                save.disabled = false;
                return;
            }

            dialog.close();
            onCreated(created.id);
            return;
        }

        if (!converted || name.length < LIMITS.title.min) {
            message.textContent = `Gib einen Namen mit mindestens ${LIMITS.title.min} Zeichen an.`;
            return;
        }

        save.disabled = true;
        message.textContent = "Wird hochgeladen …";

        const result = await createMap({
            category: select.value as MapCategoryId,
            title: name,
            image: converted.image,
            thumb: converted.thumb,
        });

        if (result.error || !result.id) {
            message.textContent = result.error ?? "Das hat nicht geklappt.";
            save.disabled = false;
            return;
        }

        dialog.close();
        onCreated(result.id);
    });
}

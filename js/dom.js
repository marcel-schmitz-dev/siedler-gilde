// ==================================================
// KLEINE HELFER FÜR DOM + DIALOGE
// ==================================================
export function esc(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
export function initials(name) {
    const parts = name.replace(/[,.]/g, "").split(/[\s-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}
// Wenn ein Bild nicht lädt: Bild durch Text ersetzen (data-fallback)
export function attachImageFallback(root) {
    root.querySelectorAll("img[data-fallback]").forEach((img) => {
        img.addEventListener("error", () => {
            const span = document.createElement("span");
            span.className = "img-fallback";
            span.textContent = img.dataset.fallback ?? "";
            img.replaceWith(span);
        }, { once: true });
    });
}
// ---------- Dialog (ein Fenster für alles) ----------
let dialog = null;
function ensureDialog() {
    if (dialog) {
        return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.className = "member-dialog";
    // Klick auf den abgedunkelten Hintergrund schließt das Fenster
    dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (target === dialog || target.closest("[data-dialog-close]")) {
            dialog?.close();
        }
    });
    document.body.appendChild(dialog);
    return dialog;
}
export function openDialog(html, modifier = "") {
    const element = ensureDialog();
    element.className = `member-dialog ${modifier}`.trim();
    element.innerHTML = `
        <div class="member-dialog__panel">
            <button type="button" class="member-dialog__close" data-dialog-close aria-label="Fenster schließen">×</button>
            ${html}
        </div>
    `;
    attachImageFallback(element);
    if (!element.open) {
        element.showModal();
    }
    return element;
}
//# sourceMappingURL=dom.js.map
import { FRAME, SLOTS } from "./data/tactic-frame.js";
import { esc } from "./dom.js";
const ICONS = {
    plus: '<path d="M12 5v14M5 12h14" />',
    minus: '<path d="M5 12h14" />',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />',
    exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14" />',
};
function icon(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}
function boxVars(box) {
    return `--l:${box.left}%;--t:${box.top}%;--w:${box.width}%;--h:${box.height}%`;
}
export function mountTacticFrame(root, options) {
    root.innerHTML = `
        <div class="tactic">
            <div class="tactic__stage">
                <img class="tactic__frame" src="${FRAME.image}" srcset="${FRAME.imageSmall} 1536w, ${FRAME.image} 3072w"
                    sizes="(max-width: 1100px) 100vw, 1100px" alt="" draggable="false" />

                <div class="tactic__window" style="${boxVars(FRAME.window)};--clip:${FRAME.windowClip}">
                    <div class="tactic__view" tabindex="0" role="group"
                        aria-label="Taktikkarte ${esc(options.title)}. Mit den Pfeiltasten verschieben, mit Plus und Minus zoomen, mit Null zurücksetzen, mit F Vollbild.">
                        <img class="tactic__map" src="${esc(options.imageUrl)}" alt="Taktikkarte ${esc(options.title)}" draggable="false" />
                    </div>
                </div>

                <div class="tactic__plaque"><span>${esc(options.title)}</span></div>

                <div class="tactic__tools" role="toolbar" aria-label="Kartenansicht">
                    <button type="button" data-act="in" aria-label="Vergrößern" title="Vergrößern">${icon("plus")}</button>
                    <button type="button" data-act="out" aria-label="Verkleinern" title="Verkleinern">${icon("minus")}</button>
                    <button type="button" data-act="reset" aria-label="Ansicht zurücksetzen" title="Zurücksetzen">${icon("reset")}</button>
                    <a href="${esc(options.downloadUrl)}" download="${esc(options.downloadName)}" aria-label="Karte herunterladen" title="Herunterladen">${icon("download")}</a>
                    <button type="button" data-act="full" aria-label="Vollbild" title="Vollbild">${icon("full")}</button>
                </div>

                <nav class="tactic__slots" aria-label="Angaben zur Taktikkarte">
                    ${SLOTS.map((slot) => `<button type="button" class="tactic__slot" data-slot="${slot.id}" style="${boxVars(slot.box)}">${slot.label}</button>`).join("")}
                </nav>
            </div>
        </div>`;
    const tactic = root.querySelector(".tactic");
    const view = root.querySelector(".tactic__view");
    const map = root.querySelector(".tactic__map");
    const fullButton = root.querySelector('[data-act="full"]');
    const inButton = root.querySelector('[data-act="in"]');
    const outButton = root.querySelector('[data-act="out"]');
    let scale = 1;
    let minScale = 1;
    let maxScale = 8;
    let tx = 0;
    let ty = 0;
    let ready = false;
    const pointers = new Map();
    function size() {
        return { vw: view.clientWidth, vh: view.clientHeight, iw: map.naturalWidth, ih: map.naturalHeight };
    }
    function clampPan() {
        const { vw, vh, iw, ih } = size();
        const w = iw * scale;
        const h = ih * scale;
        tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, tx));
        ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, ty));
    }
    function apply() {
        clampPan();
        map.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        inButton.disabled = scale >= maxScale * 0.999;
        outButton.disabled = scale <= minScale * 1.001;
    }
    function measure() {
        const { vw, vh, iw, ih } = size();
        if (!iw || !vw) {
            return;
        }
        minScale = Math.min(vw / iw, vh / ih);
        maxScale = Math.max(minScale * 8, 1.5);
    }
    function reset() {
        measure();
        scale = minScale;
        tx = 0;
        ty = 0;
        apply();
    }
    function zoomAt(factor, cx, cy) {
        const next = Math.min(maxScale, Math.max(minScale, scale * factor));
        const k = next / scale;
        tx = cx - (cx - tx) * k;
        ty = cy - (cy - ty) * k;
        scale = next;
        apply();
    }
    function center() {
        return { x: view.clientWidth / 2, y: view.clientHeight / 2 };
    }
    function local(event) {
        const rect = view.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function init() {
        if (!map.naturalWidth) {
            return;
        }
        map.style.width = `${map.naturalWidth}px`;
        map.style.height = `${map.naturalHeight}px`;
        ready = true;
        reset();
    }
    if (map.complete && map.naturalWidth) {
        init();
    }
    else {
        map.addEventListener("load", init, { once: true });
        map.addEventListener("error", () => {
            view.insertAdjacentHTML("beforeend", '<p class="tactic__error">Die Karte konnte nicht geladen werden.</p>');
        }, { once: true });
    }
    view.addEventListener("wheel", (event) => {
        if (!ready) {
            return;
        }
        event.preventDefault();
        const lines = event.deltaMode === 1 ? 16 : 1;
        const speed = event.ctrlKey ? 0.01 : 0.0016;
        const point = local(event);
        zoomAt(Math.exp(-event.deltaY * lines * speed), point.x, point.y);
    }, { passive: false });
    view.addEventListener("pointerdown", (event) => {
        if (!ready || (event.pointerType === "mouse" && event.button !== 0)) {
            return;
        }
        view.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, local(event));
        view.classList.add("is-dragging");
    });
    view.addEventListener("pointermove", (event) => {
        const previous = pointers.get(event.pointerId);
        if (!previous) {
            return;
        }
        const now = local(event);
        if (pointers.size === 1) {
            tx += now.x - previous.x;
            ty += now.y - previous.y;
            pointers.set(event.pointerId, now);
            apply();
            return;
        }
        const others = [...pointers.entries()].filter(([id]) => id !== event.pointerId);
        const other = others[0][1];
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(now.x - other.x, now.y - other.y);
        const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
        const midAfter = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
        pointers.set(event.pointerId, now);
        tx += midAfter.x - midBefore.x;
        ty += midAfter.y - midBefore.y;
        if (before > 0) {
            zoomAt(after / before, midAfter.x, midAfter.y);
        }
        else {
            apply();
        }
    });
    function release(event) {
        pointers.delete(event.pointerId);
        if (!pointers.size) {
            view.classList.remove("is-dragging");
        }
    }
    view.addEventListener("pointerup", release);
    view.addEventListener("pointercancel", release);
    view.addEventListener("dblclick", (event) => {
        if (!ready) {
            return;
        }
        if (scale > minScale * 1.05) {
            reset();
        }
        else {
            const point = local(event);
            zoomAt(3, point.x, point.y);
        }
    });
    view.addEventListener("keydown", (event) => {
        if (!ready || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        const step = 80;
        const mid = center();
        let handled = true;
        switch (event.key) {
            case "ArrowLeft":
                tx += step;
                apply();
                break;
            case "ArrowRight":
                tx -= step;
                apply();
                break;
            case "ArrowUp":
                ty += step;
                apply();
                break;
            case "ArrowDown":
                ty -= step;
                apply();
                break;
            case "+":
            case "=":
                zoomAt(1.25, mid.x, mid.y);
                break;
            case "-":
                zoomAt(0.8, mid.x, mid.y);
                break;
            case "0":
                reset();
                break;
            case "f":
            case "F":
                void toggleFullscreen();
                break;
            default:
                handled = false;
        }
        if (handled) {
            event.preventDefault();
        }
    });
    const resizeObserver = new ResizeObserver(() => {
        if (!ready) {
            return;
        }
        const wasFit = scale <= minScale * 1.001;
        measure();
        if (wasFit) {
            reset();
        }
        else {
            scale = Math.min(maxScale, Math.max(minScale, scale));
            apply();
        }
    });
    resizeObserver.observe(view);
    // Vollbild: echtes Fullscreen, auf dem iPhone ersatzweise eine Vollfläche per CSS
    function isFullscreen() {
        return document.fullscreenElement === tactic || tactic.classList.contains("is-pseudo");
    }
    function syncFullscreen() {
        const on = isFullscreen();
        tactic.classList.toggle("is-fullscreen", on);
        document.body.classList.toggle("has-tactic-fullscreen", on);
        fullButton.innerHTML = icon(on ? "exit" : "full");
        fullButton.setAttribute("aria-label", on ? "Vollbild beenden" : "Vollbild");
        fullButton.title = on ? "Vollbild beenden" : "Vollbild";
    }
    async function leaveFullscreen() {
        tactic.classList.remove("is-pseudo");
        if (document.fullscreenElement === tactic) {
            await document.exitFullscreen().catch(() => undefined);
        }
        syncFullscreen();
    }
    async function toggleFullscreen() {
        if (isFullscreen()) {
            await leaveFullscreen();
            return;
        }
        if (tactic.requestFullscreen) {
            try {
                await tactic.requestFullscreen();
                syncFullscreen();
                return;
            }
            catch {
                // fällt auf die CSS-Variante zurück
            }
        }
        tactic.classList.add("is-pseudo");
        syncFullscreen();
        view.focus();
    }
    function onFullscreenChange() {
        syncFullscreen();
    }
    function onEscape(event) {
        if (event.key === "Escape" && tactic.classList.contains("is-pseudo")) {
            void leaveFullscreen();
        }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onEscape);
    tactic.querySelector(".tactic__tools").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-act]");
        if (!button || !ready) {
            if (button?.dataset.act === "full") {
                void toggleFullscreen();
            }
            return;
        }
        const mid = center();
        switch (button.dataset.act) {
            case "in":
                zoomAt(1.4, mid.x, mid.y);
                break;
            case "out":
                zoomAt(1 / 1.4, mid.x, mid.y);
                break;
            case "reset":
                reset();
                break;
            case "full":
                void toggleFullscreen();
                break;
        }
    });
    tactic.querySelector(".tactic__slots").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-slot]");
        if (button) {
            options.onSlot(button.dataset.slot);
        }
    });
    return {
        destroy() {
            resizeObserver.disconnect();
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            document.removeEventListener("keydown", onEscape);
            document.body.classList.remove("has-tactic-fullscreen");
            if (document.fullscreenElement === tactic) {
                void document.exitFullscreen().catch(() => undefined);
            }
        },
    };
}
//# sourceMappingURL=tactic-frame.js.map
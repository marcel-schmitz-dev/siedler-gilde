import { BAR, FRAME, SLOTS } from "./data/tactic-frame.js";
import type { Box, SlotId } from "./data/tactic-frame.js";
import { esc } from "./dom.js";

export interface TacticFrameOptions {
    title: string;
    imageUrl: string;
    downloadUrl: string;
    downloadName: string;
    onSlot: (id: SlotId) => void;
    canMark?: boolean;
    onMarkToggle?: () => void;
    onPlaceMark?: (x: number, y: number) => void;
    onRemoveMark?: (key: string) => void;
    onMoveMark?: (key: string, x: number, y: number) => void;
    onRemoveLine?: (key: string) => void;
}

export interface MapLine {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface MapMark {
    key: string;
    kind?: "camp" | "pin";
    nr: string;
    x: number; // Anteil an der Bildbreite, 0 bis 1
    y: number; // Anteil an der Bildhöhe, 0 bis 1
}

export interface PanelHooks {
    beforeClose?: () => boolean;
    onClose?: () => void;
}

export interface TacticFrame {
    destroy(): void;
    openPanel(id: string, title: string, hooks?: PanelHooks): HTMLElement;
    closePanel(): void;
    panelId(): string;
    setMarks(marks: MapMark[]): void;
    setLines(lines: MapLine[]): void;
    setPending(point: { x: number; y: number } | null): void;
    setMarking(on: boolean, lineEdit?: boolean): void;
}

const ICONS = {
    plus: '<path d="M12 5v14M5 12h14" />',
    minus: '<path d="M5 12h14" />',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />',
    exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14" />',
    pin: '<path d="M12 21s6-5.6 6-11a6 6 0 0 0-12 0c0 5.4 6 11 6 11z" /><circle cx="12" cy="10" r="2.2" />',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />',
};

function icon(name: keyof typeof ICONS): string {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

const SLOT_ICONS: Record<SlotId, string> = {
    generals:
        '<path d="M4 16v-4a8 8 0 0 1 16 0v4l-2.5 1V21h-3l-1-3h-3l-1 3h-3v-4z" /><path d="M8.5 12.5h7" />',
    units: '<path d="M4 4l10.5 10.5M20 4L9.5 14.5M13 15.5l3.5 3.5M11 15.5L7.5 19M5.5 18l-2 2M18.5 18l2 2" />',
    specials:
        '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.3L12 17.1 6.4 20.2l1.2-6.3L3 9.6l6.3-.8z" />',
    tips: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />',
};

function boxVars(box: Box): string {
    return `--l:${box.left}%;--t:${box.top}%;--w:${box.width}%;--h:${box.height}%`;
}

export function mountTacticFrame(root: HTMLElement, options: TacticFrameOptions): TacticFrame {
    root.innerHTML = `
        <div class="tactic">
            <div class="tactic__stage">
                <img class="tactic__frame" src="${FRAME.image}" srcset="${FRAME.imageSmall} 1536w, ${FRAME.image} 3072w"
                    sizes="(max-width: 1100px) 100vw, 1100px" alt="" draggable="false" />

                <div class="tactic__window" style="${boxVars(FRAME.window)};--clip:${FRAME.windowClip}">
                    <div class="tactic__view" tabindex="0" role="group"
                        aria-label="Taktikkarte ${esc(options.title)}. Mit den Pfeiltasten verschieben, mit Plus und Minus zoomen, mit Null zurücksetzen, mit F Vollbild.">
                        <img class="tactic__map" src="${esc(options.imageUrl)}" alt="Taktikkarte ${esc(options.title)}" draggable="false" />
                        <div class="tactic__marks"></div>
                    </div>
                </div>

                <div class="tactic__plaque"><span>${esc(options.title)}</span></div>

                <div class="tactic__tools" role="toolbar" aria-label="Kartenansicht">
                    <button type="button" data-act="in" aria-label="Vergrößern" title="Vergrößern">${icon("plus")}</button>
                    <button type="button" data-act="out" aria-label="Verkleinern" title="Verkleinern">${icon("minus")}</button>
                    <button type="button" data-act="reset" aria-label="Ansicht zurücksetzen" title="Zurücksetzen">${icon("reset")}</button>
                    <button type="button" data-act="marks" aria-label="Lager auf der Karte ein- oder ausblenden" title="Lager ein-/ausblenden" hidden>${icon("eye")}</button>
                    ${
                        options.canMark
                            ? `<button type="button" data-act="mark" aria-label="Lager auf der Karte markieren" title="Lager markieren" aria-pressed="false">${icon("pin")}</button>`
                            : ""
                    }
                    <a href="${esc(options.downloadUrl)}" download="${esc(options.downloadName)}" aria-label="Karte herunterladen" title="Herunterladen">${icon("download")}</a>
                    <button type="button" data-act="full" aria-label="Vollbild" title="Vollbild">${icon("full")}</button>
                </div>

                <nav class="tactic__slots" aria-label="Angaben zur Taktikkarte" style="${boxVars(BAR)}">
                    ${SLOTS.map(
                        (slot) =>
                            `<button type="button" class="tactic__slot" data-slot="${slot.id}" aria-label="${slot.label}"><svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_ICONS[slot.id]}</svg><span>${slot.label}</span></button>`
                    ).join("")}
                </nav>
            </div>
        </div>`;

    const tactic = root.querySelector<HTMLElement>(".tactic")!;
    const view = root.querySelector<HTMLElement>(".tactic__view")!;
    const map = root.querySelector<HTMLImageElement>(".tactic__map")!;
    const fullButton = root.querySelector<HTMLButtonElement>('[data-act="full"]')!;
    const inButton = root.querySelector<HTMLButtonElement>('[data-act="in"]')!;
    const outButton = root.querySelector<HTMLButtonElement>('[data-act="out"]')!;

    let scale = 1;
    let minScale = 1;
    let maxScale = 8;
    let tx = 0;
    let ty = 0;
    let ready = false;

    const pointers = new Map<number, { x: number; y: number }>();

    function size(): { vw: number; vh: number; iw: number; ih: number } {
        return { vw: view.clientWidth, vh: view.clientHeight, iw: map.naturalWidth, ih: map.naturalHeight };
    }

    function clampPan(): void {
        const { vw, vh, iw, ih } = size();
        const w = iw * scale;
        const h = ih * scale;

        tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, tx));
        ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, ty));
    }

    function apply(): void {
        clampPan();
        map.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        inButton.disabled = scale >= maxScale * 0.999;
        outButton.disabled = scale <= minScale * 1.001;
        positionMarks();
    }

    // Lager-Markierungen: liegen in einer eigenen Ebene, damit sie beim Zoomen gleich groß bleiben
    const layer = root.querySelector<HTMLElement>(".tactic__marks")!;
    const eyeButton = root.querySelector<HTMLButtonElement>('[data-act="marks"]')!;
    const pinButton = root.querySelector<HTMLButtonElement>('[data-act="mark"]');
    let marks: MapMark[] = [];
    let lines: MapLine[] = [];
    let pending: { x: number; y: number } | null = null;
    let marking = false;
    let lineEdit = false;

    function positionMarks(): void {
        const { iw, ih } = size();

        if (!iw) {
            return;
        }

        layer.querySelectorAll<HTMLElement>(".tactic__mark").forEach((element, index) => {
            const mark = marks[index];

            element.style.transform = `translate(${tx + mark.x * iw * scale}px, ${ty + mark.y * ih * scale}px)`;
        });

        const px = (x: number): number => tx + x * iw * scale;
        const py = (y: number): number => ty + y * ih * scale;

        layer.querySelectorAll<SVGLineElement>("svg line").forEach((element) => {
            const line = lines.find((item) => item.key === element.dataset.key);

            if (line) {
                element.setAttribute("x1", String(px(line.x1)));
                element.setAttribute("y1", String(py(line.y1)));
                element.setAttribute("x2", String(px(line.x2)));
                element.setAttribute("y2", String(py(line.y2)));
            }
        });

        const dot = layer.querySelector<SVGCircleElement>("svg circle");

        if (dot && pending) {
            dot.setAttribute("cx", String(px(pending.x)));
            dot.setAttribute("cy", String(py(pending.y)));
        }
    }

    function renderMarks(): void {
        const svg = `<svg class="tactic__lines" aria-hidden="true">${lines
            .map(
                (line) =>
                    `<line class="tactic__line-hit" data-key="${esc(line.key)}" /><line class="tactic__line" data-key="${esc(line.key)}" />`
            )
            .join("")}${pending ? '<circle class="tactic__pending" r="6" />' : ""}</svg>`;

        layer.innerHTML =
            svg +
            marks
                .map((mark) => {
                    const pin = mark.kind === "pin";
                    const label = pin ? `Position ${mark.nr}` : `Lager ${mark.nr}`;

                    return `<div class="tactic__mark${pin ? " tactic__mark--pin" : ""}${mark.nr.length > 2 ? " is-long" : ""}" data-key="${esc(mark.key)}" role="img" aria-label="${esc(label)}"><span>${esc(mark.nr)}</span></div>`;
                })
                .join("");
        eyeButton.hidden = marks.length === 0 && lines.length === 0;
        positionMarks();
    }

    function fraction(event: { clientX: number; clientY: number }): { x: number; y: number } {
        const { iw, ih } = size();
        const point = local(event);

        return {
            x: Math.min(1, Math.max(0, (point.x - tx) / (iw * scale))),
            y: Math.min(1, Math.max(0, (point.y - ty) / (ih * scale))),
        };
    }

    let markDrag: { key: string; index: number; x: number; y: number; moved: boolean } | null = null;

    layer.addEventListener("pointerdown", (event) => {
        const hit = (event.target as Element).closest<SVGLineElement>(".tactic__line-hit");

        if (marking && lineEdit && hit) {
            event.stopPropagation();
            options.onRemoveLine?.(hit.dataset.key!);
            return;
        }

        const element = (event.target as HTMLElement).closest<HTMLElement>(".tactic__mark");

        if (!marking || !element) {
            return;
        }

        event.stopPropagation();
        element.setPointerCapture(event.pointerId);

        const index = [...layer.querySelectorAll(".tactic__mark")].indexOf(element);

        markDrag = { key: marks[index].key, index, x: event.clientX, y: event.clientY, moved: false };
    });

    layer.addEventListener("pointermove", (event) => {
        if (!markDrag) {
            return;
        }

        if (Math.hypot(event.clientX - markDrag.x, event.clientY - markDrag.y) > 4) {
            markDrag.moved = true;
        }

        if (markDrag.moved) {
            const position = fraction(event);

            marks[markDrag.index].x = position.x;
            marks[markDrag.index].y = position.y;
            positionMarks();
        }
    });

    layer.addEventListener("pointerup", (event) => {
        if (!markDrag) {
            return;
        }

        const done = markDrag;

        markDrag = null;

        if (done.moved) {
            options.onMoveMark?.(done.key, marks[done.index].x, marks[done.index].y);
        } else {
            options.onRemoveMark?.(done.key);
        }

        event.stopPropagation();
    });

    let press: { x: number; y: number; moved: boolean } | null = null;

    function measure(): void {
        const { vw, vh, iw, ih } = size();

        if (!iw || !vw) {
            return;
        }

        minScale = Math.min(vw / iw, vh / ih);
        maxScale = Math.max(minScale * 8, 1.5);
    }

    function reset(): void {
        measure();
        scale = minScale;
        tx = 0;
        ty = 0;
        apply();
    }

    function zoomAt(factor: number, cx: number, cy: number): void {
        const next = Math.min(maxScale, Math.max(minScale, scale * factor));
        const k = next / scale;

        tx = cx - (cx - tx) * k;
        ty = cy - (cy - ty) * k;
        scale = next;
        apply();
    }

    function center(): { x: number; y: number } {
        return { x: view.clientWidth / 2, y: view.clientHeight / 2 };
    }

    function local(event: { clientX: number; clientY: number }): { x: number; y: number } {
        const rect = view.getBoundingClientRect();

        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function init(): void {
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
    } else {
        map.addEventListener("load", init, { once: true });
        map.addEventListener(
            "error",
            () => {
                view.insertAdjacentHTML("beforeend", '<p class="tactic__error">Die Karte konnte nicht geladen werden.</p>');
            },
            { once: true }
        );
    }

    view.addEventListener(
        "wheel",
        (event) => {
            if (!ready) {
                return;
            }

            event.preventDefault();

            const lines = event.deltaMode === 1 ? 16 : 1;
            const speed = event.ctrlKey ? 0.01 : 0.0016;
            const point = local(event);

            zoomAt(Math.exp(-event.deltaY * lines * speed), point.x, point.y);
        },
        { passive: false }
    );

    view.addEventListener("pointerdown", (event) => {
        if (!ready || (event.pointerType === "mouse" && event.button !== 0)) {
            return;
        }

        view.setPointerCapture(event.pointerId);

        if (!pointers.size) {
            press = { x: event.clientX, y: event.clientY, moved: false };
        } else if (press) {
            press.moved = true;
        }

        pointers.set(event.pointerId, local(event));
        view.classList.add("is-dragging");
    });

    view.addEventListener("pointermove", (event) => {
        const previous = pointers.get(event.pointerId);

        if (!previous) {
            return;
        }

        const now = local(event);

        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5) {
            press.moved = true;
        }

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
        } else {
            apply();
        }
    });

    function release(event: PointerEvent): void {
        pointers.delete(event.pointerId);

        if (!pointers.size) {
            view.classList.remove("is-dragging");
        }
    }

    view.addEventListener("pointerup", (event) => {
        const wasClick = marking && press && !press.moved && pointers.size === 1;

        release(event);

        if (wasClick) {
            const position = fraction(event);

            options.onPlaceMark?.(position.x, position.y);
        }

        if (!pointers.size) {
            press = null;
        }
    });
    view.addEventListener("pointercancel", release);

    view.addEventListener("dblclick", (event) => {
        if (!ready || marking) {
            return;
        }

        if (scale > minScale * 1.05) {
            reset();
        } else {
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
        } else {
            scale = Math.min(maxScale, Math.max(minScale, scale));
            apply();
        }
    });

    resizeObserver.observe(view);

    // Vollbild: echtes Fullscreen, auf dem iPhone ersatzweise eine Vollfläche per CSS
    function isFullscreen(): boolean {
        return document.fullscreenElement === tactic || tactic.classList.contains("is-pseudo");
    }

    function syncFullscreen(): void {
        const on = isFullscreen();

        tactic.classList.toggle("is-fullscreen", on);
        document.body.classList.toggle("has-tactic-fullscreen", on);
        fullButton.innerHTML = icon(on ? "exit" : "full");
        fullButton.setAttribute("aria-label", on ? "Vollbild beenden" : "Vollbild");
        fullButton.title = on ? "Vollbild beenden" : "Vollbild";
    }

    async function leaveFullscreen(): Promise<void> {
        tactic.classList.remove("is-pseudo");

        if (document.fullscreenElement === tactic) {
            await document.exitFullscreen().catch(() => undefined);
        }

        syncFullscreen();
    }

    async function toggleFullscreen(): Promise<void> {
        if (isFullscreen()) {
            await leaveFullscreen();
            return;
        }

        if (tactic.requestFullscreen) {
            try {
                await tactic.requestFullscreen();
                syncFullscreen();
                return;
            } catch {
                // fällt auf die CSS-Variante zurück
            }
        }

        tactic.classList.add("is-pseudo");
        syncFullscreen();
        view.focus();
    }

    function onFullscreenChange(): void {
        syncFullscreen();
    }

    function onEscape(event: KeyboardEvent): void {
        if (event.key === "Escape" && tactic.classList.contains("is-pseudo")) {
            void leaveFullscreen();
        }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onEscape);

    tactic.querySelector(".tactic__tools")!.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-act]");

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
            case "marks":
                layer.hidden = !layer.hidden;
                eyeButton.setAttribute("aria-pressed", String(layer.hidden));
                break;
            case "mark":
                options.onMarkToggle?.();
                break;
            case "full":
                void toggleFullscreen();
                break;
        }
    });

    tactic.querySelector(".tactic__slots")!.addEventListener("click", (event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-slot]");

        if (button) {
            options.onSlot(button.dataset.slot as SlotId);
        }
    });

    // Schwebendes Fenster (z. B. Einheiten), lässt sich verschieben und verdeckt die Karte nicht dauerhaft
    const stage = root.querySelector<HTMLElement>(".tactic__stage")!;
    let panel: HTMLElement | null = null;
    let currentPanel = "";

    let panelHooks: PanelHooks | undefined;

    function removePanel(): void {
        const hooks = panelHooks;

        panel?.remove();
        panel = null;
        currentPanel = "";
        panelHooks = undefined;
        hooks?.onClose?.();
    }

    function closePanel(): void {
        if (panelHooks?.beforeClose && !panelHooks.beforeClose()) {
            return;
        }

        removePanel();
    }

    function openPanel(id: string, title: string, hooks?: PanelHooks): HTMLElement {
        removePanel();
        currentPanel = id;
        panelHooks = hooks;

        panel = document.createElement("section");
        panel.className = "tactic__panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", title);
        panel.innerHTML = `
            <header class="tactic__panel-head" tabindex="0" title="Zum Verschieben ziehen">
                <span>${esc(title)}</span>
                <button type="button" data-panel-close aria-label="Fenster schließen">×</button>
            </header>
            <div class="tactic__panel-body"></div>`;

        stage.appendChild(panel);

        const head = panel.querySelector<HTMLElement>(".tactic__panel-head")!;
        const box = panel;
        let drag: { x: number; y: number; left: number; top: number } | null = null;

        function place(left: number, top: number): void {
            box.style.right = "auto";
            box.style.left = `${Math.min(Math.max(0, left), stage.clientWidth - box.offsetWidth)}px`;
            box.style.top = `${Math.min(Math.max(0, top), stage.clientHeight - head.offsetHeight)}px`;
        }

        head.addEventListener("pointerdown", (event) => {
            if ((event.target as HTMLElement).closest("button")) {
                return;
            }

            head.setPointerCapture(event.pointerId);
            drag = { x: event.clientX, y: event.clientY, left: box.offsetLeft, top: box.offsetTop };
        });

        head.addEventListener("pointermove", (event) => {
            if (drag) {
                place(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
            }
        });

        head.addEventListener("pointerup", () => {
            drag = null;
        });

        head.addEventListener("keydown", (event) => {
            const step = 24;
            const moves: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
            };

            if (moves[event.key]) {
                event.preventDefault();
                place(box.offsetLeft + moves[event.key][0], box.offsetTop + moves[event.key][1]);
            }
        });

        box.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                closePanel();
            }
        });

        box.querySelector("[data-panel-close]")!.addEventListener("click", closePanel);

        // Fenster ins Bild holen, sonst merkt man bei gescrollter Seite nicht, dass es offen ist
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        box.scrollIntoView({ block: "center", inline: "nearest", behavior: calm ? "auto" : "smooth" });
        head.focus({ preventScroll: true });
        box.classList.add("is-new");
        box.addEventListener("animationend", () => box.classList.remove("is-new"), { once: true });

        return box.querySelector<HTMLElement>(".tactic__panel-body")!;
    }

    return {
        openPanel,
        closePanel,
        panelId: () => currentPanel,
        setMarks(next: MapMark[]): void {
            marks = next.map((mark) => ({ ...mark }));
            renderMarks();
        },
        setLines(next: MapLine[]): void {
            lines = next.map((line) => ({ ...line }));
            renderMarks();
        },
        setPending(point: { x: number; y: number } | null): void {
            pending = point;
            renderMarks();
        },
        setMarking(on: boolean, lineMode = false): void {
            marking = on;
            lineEdit = on && lineMode;
            view.classList.toggle("is-marking", on);
            layer.classList.toggle("is-editing", on);
            layer.classList.toggle("is-line-edit", on && lineMode);
            pinButton?.setAttribute("aria-pressed", String(on));
        },
        destroy(): void {
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

// ==================================================
// EHRUNG FÜR FRANJO
// Beim Überfahren des Bildes (oder per Button) wechselt das Bild
// zum Motorrad und der Text zum Hobby-Text.
// ==================================================
export function initTribute() {
    const tribute = document.querySelector("#member-tribute");
    const stage = document.querySelector("#tribute-stage");
    const toggle = document.querySelector("#tribute-toggle");
    const mainText = document.querySelector("#tribute-main");
    const altText = document.querySelector("#tribute-alt");
    if (!tribute || !stage || !toggle || !mainText || !altText) {
        return;
    }
    let hovered = false;
    let pinned = false;
    function render() {
        const showAlt = hovered || pinned;
        tribute.classList.toggle("is-alt", showAlt);
        // Für Screenreader nur den sichtbaren Text vorlesen lassen
        mainText.setAttribute("aria-hidden", String(showAlt));
        altText.setAttribute("aria-hidden", String(!showAlt));
        toggle.setAttribute("aria-pressed", String(pinned));
        toggle.textContent = pinned ? "Zurück zur Gilde" : "Franjos Hobby";
    }
    // Hover nur auf Geräten mit Maus (auf Touch übernimmt der Button)
    const canHover = window.matchMedia("(hover: hover)");
    stage.addEventListener("mouseenter", () => {
        if (canHover.matches) {
            hovered = true;
            render();
        }
    });
    stage.addEventListener("mouseleave", () => {
        hovered = false;
        render();
    });
    toggle.addEventListener("click", () => {
        pinned = !pinned;
        render();
    });
    render();
}
//# sourceMappingURL=tribute.js.map
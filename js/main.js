import { initAuth } from "./auth.js";
initAuth();
// =========================
// MOBILE NAVIGATION
// =========================
const menuButton = document.querySelector(".menu-button");
const navElement = document.querySelector(".main-navigation");
const navigationLinks = document.querySelectorAll(".nav-link");
if (menuButton && navElement) {
    menuButton.addEventListener("click", () => {
        const isOpen = navElement.classList.toggle("is-open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Menü schließen" : "Menü öffnen");
    });
    navigationLinks.forEach((link) => {
        link.addEventListener("click", () => {
            navElement.classList.remove("is-open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Menü öffnen");
        });
    });
}
//# sourceMappingURL=main.js.map
"use strict";
// =========================
// MOBILE NAVIGATION
// =========================
const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".main-navigation");
const navigationLinks = document.querySelectorAll(".nav-link");
// Prüfen, ob die benötigten Elemente vorhanden sind
if (menuButton && navigation) {
    // Menü öffnen und schließen
    menuButton.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("is-open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute("aria-label", isOpen ? "Menü schließen" : "Menü öffnen");
    });
    // Menü schließen, wenn ein Link geklickt wird
    navigationLinks.forEach((link) => {
        link.addEventListener("click", () => {
            navigation.classList.remove("is-open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Menü öffnen");
        });
    });
}
//# sourceMappingURL=main.js.map
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.js";

type AuthView = "signup" | "login";
type MessageType = "error" | "success";

// Andere Module (z. B. der Mitgliederbereich) können sich hier auf Login/Logout einklinken
type SessionListener = (session: Session | null) => void;
const sessionListeners = new Set<SessionListener>();

export function onSessionChange(listener: SessionListener): void {
    sessionListeners.add(listener);
}

export function initAuth(): void {
    const modal = document.querySelector<HTMLElement>("#auth-modal");
    const title = document.querySelector<HTMLElement>("#auth-title");
    const message = document.querySelector<HTMLElement>("#auth-message");
    const signupForm = document.querySelector<HTMLFormElement>("#signup-form");
    const loginForm = document.querySelector<HTMLFormElement>("#login-form");
    const tabs = document.querySelectorAll<HTMLButtonElement>(".auth-tab");
    const userName = document.querySelector<HTMLElement>("#auth-user-name");
    const logoutButton = document.querySelector<HTMLButtonElement>("#auth-logout");

    if (!modal || !title || !message || !signupForm || !loginForm) {
        return;
    }

    let lastTrigger: HTMLElement | null = null;

    // =========================
    // HILFSFUNKTIONEN
    // =========================

    function showMessage(text: string, type: MessageType): void {
        message!.textContent = text;
        message!.className = `auth-message auth-message--${type}`;
    }

    function clearMessage(): void {
        message!.textContent = "";
        message!.className = "auth-message";
    }

    function setLoading(form: HTMLFormElement, loading: boolean): void {
        const button = form.querySelector<HTMLButtonElement>("button[type='submit']");
        if (!button) return;
        button.disabled = loading;
        button.classList.toggle("is-loading", loading);
    }

    function translateError(error: { message: string }): string {
        const text = error.message.toLowerCase();

        if (text.includes("invalid login credentials")) {
            return "E-Mail oder Passwort ist falsch.";
        }
        if (text.includes("email not confirmed")) {
            return "Bitte bestätige zuerst deine E-Mail-Adresse (Link im Postfach).";
        }
        if (text.includes("already registered")) {
            return "Diese E-Mail ist bereits registriert. Bitte melde dich an.";
        }
        if (text.includes("database error saving new user")) {
            return "Dieser Spielername ist leider schon vergeben.";
        }
        if (text.includes("password should be at least")) {
            return "Das Passwort ist zu kurz (mindestens 8 Zeichen).";
        }
        if (text.includes("rate limit") || text.includes("too many")) {
            return "Zu viele Versuche. Bitte warte kurz und versuche es erneut.";
        }
        return "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
    }

    // =========================
    // MODAL ÖFFNEN / SCHLIESSEN
    // =========================

    function switchView(view: AuthView): void {
        const isSignup = view === "signup";

        signupForm!.hidden = !isSignup;
        loginForm!.hidden = isSignup;
        title!.textContent = isSignup ? "Werde Teil der Gilde" : "Willkommen zurück";

        tabs.forEach((tab) => {
            const active = tab.dataset.authView === view;
            tab.classList.toggle("is-active", active);
            tab.setAttribute("aria-selected", String(active));
        });

        clearMessage();
    }

    function openModal(view: AuthView, trigger: HTMLElement | null): void {
        lastTrigger = trigger;
        switchView(view);
        modal!.hidden = false;
        document.body.classList.add("auth-open");

        const form = view === "signup" ? signupForm! : loginForm!;
        form.querySelector<HTMLInputElement>("input")?.focus();
    }

    function closeModal(): void {
        modal!.hidden = true;
        document.body.classList.remove("auth-open");
        lastTrigger?.focus();
    }

    document.querySelectorAll<HTMLElement>("[data-auth-open]").forEach((element) => {
        element.addEventListener("click", (event) => {
            event.preventDefault();
            const view: AuthView =
                element.dataset.authOpen === "login" ? "login" : "signup";
            openModal(view, element);
        });
    });

    modal.querySelectorAll<HTMLElement>("[data-auth-close]").forEach((element) => {
        element.addEventListener("click", closeModal);
    });

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            switchView(tab.dataset.authView === "login" ? "login" : "signup");
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    // =========================
    // REGISTRIEREN
    // =========================

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const data = new FormData(signupForm);
        const username = String(data.get("username") ?? "").trim();
        const email = String(data.get("email") ?? "").trim();
        const password = String(data.get("password") ?? "");
        const passwordRepeat = String(data.get("passwordRepeat") ?? "");

        if (username.length < 3 || username.length > 20) {
            showMessage("Der Spielername braucht 3 bis 20 Zeichen.", "error");
            return;
        }
        if (password.length < 8) {
            showMessage("Das Passwort braucht mindestens 8 Zeichen.", "error");
            return;
        }
        if (password !== passwordRepeat) {
            showMessage("Die Passwörter stimmen nicht überein.", "error");
            return;
        }

        setLoading(signupForm, true);

        const { data: result, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username },
                emailRedirectTo: window.location.origin + window.location.pathname,
            },
        });

        setLoading(signupForm, false);

        if (error) {
            showMessage(translateError(error), "error");
            return;
        }

        // Bereits registrierte E-Mail: Supabase meldet dann keine Identities zurück
        if (result.user && result.user.identities?.length === 0) {
            showMessage("Diese E-Mail ist bereits registriert. Bitte melde dich an.", "error");
            return;
        }

        signupForm.reset();

        if (result.session) {
            showMessage("Willkommen bei den Gründern von Goldenau!", "success");
            window.setTimeout(closeModal, 1200);
        } else {
            showMessage(
                "Fast geschafft! Wir haben dir eine E-Mail geschickt. Bestätige sie, dann kannst du dich anmelden.",
                "success"
            );
        }
    });

    // =========================
    // ANMELDEN
    // =========================

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const data = new FormData(loginForm);
        const email = String(data.get("email") ?? "").trim();
        const password = String(data.get("password") ?? "");

        setLoading(loginForm, true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        setLoading(loginForm, false);

        if (error) {
            showMessage(translateError(error), "error");
            return;
        }

        loginForm.reset();
        closeModal();
    });

    // =========================
    // ABMELDEN
    // =========================

    logoutButton?.addEventListener("click", async () => {
        await supabase.auth.signOut();
    });

    // =========================
    // LOGIN-STATUS IM HEADER
    // =========================

    function updateUi(session: Session | null): void {
        const loggedIn = session !== null;
        document.body.classList.toggle("is-authenticated", loggedIn);

        if (userName) {
            const meta = session?.user.user_metadata as { username?: string } | undefined;
            userName.textContent = meta?.username ?? session?.user.email ?? "";
        }

        sessionListeners.forEach((listener) => listener(session));
    }

    supabase.auth.onAuthStateChange((_event, session) => {
        updateUi(session);
    });

    void supabase.auth.getSession().then(({ data }) => updateUi(data.session));
}

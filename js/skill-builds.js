import { EXPLORERS, GENERALS, GEOLOGISTS } from "./data/specialists.js";
import { SKILL_POINT_LIMIT, isValidLevels } from "./data/skill-trees.js";
import { supabase } from "./supabase.js";
export function unitsOf(type) {
    if (type === "general") {
        return GENERALS.map((g) => ({ slug: g.slug, name: g.name, abbr: g.abbr, hint: `Garnison ${g.capacity}` }));
    }
    if (type === "explorer") {
        return EXPLORERS.map((e) => ({ slug: e.slug, name: e.name, abbr: e.abbr, hint: `${e.speed} % Tempo` }));
    }
    return GEOLOGISTS.map((g) => ({ slug: g.slug, name: g.name, abbr: g.abbr, hint: `${g.speed} % Tempo` }));
}
export function findUnit(type, slug) {
    return unitsOf(type).find((unit) => unit.slug === slug);
}
export async function getCurrentUser() {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
        return null;
    }
    const meta = user.user_metadata;
    return { id: user.id, username: meta?.username ?? user.email?.split("@")[0] ?? "Siedler" };
}
function fromRow(row) {
    // Nur Skillungen anzeigen, die zu den aktuellen Daten passen (Einheit bekannt, Stufen gültig)
    if (!findUnit(row.unit_type, row.unit_slug) || !isValidLevels(row.unit_type, row.skills)) {
        return null;
    }
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
        id: row.id,
        userId: row.user_id,
        username: profile?.username ?? "Unbekannt",
        unitType: row.unit_type,
        unitSlug: row.unit_slug,
        title: row.title ?? "",
        skills: row.skills,
        createdAt: row.created_at,
    };
}
export async function loadBuilds() {
    const { data, error } = await supabase
        .from("skill_builds")
        .select("id, user_id, unit_type, unit_slug, title, skills, created_at, profiles(username)")
        .order("created_at", { ascending: false });
    if (error) {
        return { builds: [], error: "Die Skillungen konnten nicht geladen werden. Bitte versuche es später erneut." };
    }
    const builds = data
        .map(fromRow)
        .filter((build) => build !== null);
    return { builds };
}
function translateSaveError(error) {
    if (error.code === "23505") {
        return "Von dir gibt es für diesen Spezialisten schon eine Skillung mit diesem Zusatz. Wähle einen anderen Zusatz.";
    }
    if (error.code === "23514") {
        return "Die Skillung ist ungültig (Punktelimit oder Freischaltung der Reihen).";
    }
    if (error.code === "42501" || error.message.toLowerCase().includes("row-level security")) {
        return "Du musst angemeldet sein, um eine Skillung zu speichern.";
    }
    return "Speichern hat nicht geklappt. Bitte versuche es erneut.";
}
export async function saveBuild(input) {
    if (!isValidLevels(input.unitType, input.skills)) {
        return `Die Skillung ist ungültig (höchstens ${SKILL_POINT_LIMIT[input.unitType]} Punkte, Reihen müssen freigeschaltet sein).`;
    }
    // user_id setzt die Datenbank selbst (auth.uid())
    const { error } = await supabase.from("skill_builds").insert({
        unit_type: input.unitType,
        unit_slug: input.unitSlug,
        title: input.title.trim(),
        skills: input.skills,
    });
    return error ? translateSaveError(error) : null;
}
export async function deleteBuild(id) {
    const { error } = await supabase.from("skill_builds").delete().eq("id", id);
    return error ? "Löschen hat nicht geklappt. Bitte versuche es erneut." : null;
}
//# sourceMappingURL=skill-builds.js.map
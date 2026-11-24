import { EXPLORERS, GENERALS, GEOLOGISTS } from "./data/specialists.js";
import { SKILL_POINT_LIMIT, isValidLevels } from "./data/skill-trees.js";
import type { SkillUnitType } from "./data/skill-trees.js";
import { supabase } from "./supabase.js";

// ==================================================
// SKILLUNGEN DER MITGLIEDER (Tabelle public.skill_builds in Supabase)
// Der Ersteller ist immer das eingeloggte Mitglied (user_id = auth.uid(), Name aus profiles.username).
// ==================================================

export interface SkillBuild {
    id: string;
    userId: string;
    username: string;
    unitType: SkillUnitType;
    unitSlug: string;
    title: string; // Zusatz / Verwendungszweck, darf bei der ersten Skillung leer sein
    skills: number[];
    createdAt: string;
}

export interface CurrentUser {
    id: string;
    username: string;
}

export interface UnitInfo {
    slug: string;
    name: string;
    abbr: string;
    hint: string;
}

export function unitsOf(type: SkillUnitType): UnitInfo[] {
    if (type === "general") {
        return GENERALS.map((g) => ({ slug: g.slug, name: g.name, abbr: g.abbr, hint: `Garnison ${g.capacity}` }));
    }
    if (type === "explorer") {
        return EXPLORERS.map((e) => ({ slug: e.slug, name: e.name, abbr: e.abbr, hint: `${e.speed} % Tempo` }));
    }
    return GEOLOGISTS.map((g) => ({ slug: g.slug, name: g.name, abbr: g.abbr, hint: `${g.speed} % Tempo` }));
}

export function findUnit(type: SkillUnitType, slug: string): UnitInfo | undefined {
    return unitsOf(type).find((unit) => unit.slug === slug);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
        return null;
    }

    const meta = user.user_metadata as { username?: string } | undefined;

    return { id: user.id, username: meta?.username ?? user.email?.split("@")[0] ?? "Siedler" };
}

export interface SkillBuildRow {
    id: string;
    user_id: string;
    unit_type: SkillUnitType;
    unit_slug: string;
    title: string | null;
    skills: unknown;
    created_at: string;
    profiles: { username: string } | { username: string }[] | null;
}

export function buildFromRow(row: SkillBuildRow): SkillBuild | null {
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
        skills: row.skills as number[],
        createdAt: row.created_at,
    };
}

export const BUILD_COLUMNS = "id, user_id, unit_type, unit_slug, title, skills, created_at, profiles(username)";

export async function loadBuilds(): Promise<{ builds: SkillBuild[]; error?: string }> {
    const { data, error } = await supabase
        .from("skill_builds")
        .select(BUILD_COLUMNS)
        .order("created_at", { ascending: false });

    if (error) {
        return { builds: [], error: "Die Skillungen konnten nicht geladen werden. Bitte versuche es später erneut." };
    }

    const builds = (data as unknown as SkillBuildRow[])
        .map(buildFromRow)
        .filter((build): build is SkillBuild => build !== null);

    return { builds };
}

function translateSaveError(error: { code?: string; message: string }): string {
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

export async function saveBuild(input: {
    unitType: SkillUnitType;
    unitSlug: string;
    title: string;
    skills: number[];
}): Promise<string | null> {
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

export async function deleteBuild(id: string): Promise<string | null> {
    const { error } = await supabase.from("skill_builds").delete().eq("id", id);

    return error ? "Löschen hat nicht geklappt. Bitte versuche es erneut." : null;
}

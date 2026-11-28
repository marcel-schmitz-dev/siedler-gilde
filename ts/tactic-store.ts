import { ADVENTURE_MAPS } from "./data/adventure-maps.js";
import { findTemplate } from "./data/map-templates.js";
import type { MapCategoryId } from "./data/adventure-maps.js";
import { BUILD_COLUMNS, buildFromRow, getCurrentUser } from "./skill-builds.js";
import type { SkillBuild, SkillBuildRow } from "./skill-builds.js";
import { supabase } from "./supabase.js";

export type MapStatus = "pending" | "approved";

export const LIMITS = {
    title: { min: 3, max: 60 },
    text: 1500,
    note: 200,
    generals: 8,
    camps: 30,
    campUnits: 8,
    campNr: 3,
    campGeneral: 12,
    campFk: 6,
    fkName: 30,
    fkCount: 99,
    pins: 30,
    pinText: 4,
    lines: 30,
    campLosses: 40,
    unitCount: 9999,
    marks: 10,
    vanguardUnits: 4,
    pinNote: 60,
};

export interface CampUnit {
    unit: string;
    count: number;
}

export interface CampMark {
    x: number;
    y: number;
}

export interface CampFk {
    name: string;
    count: number;
}

// Vorwelle: ein General mit wenigen Einheiten (oft 1 Rekrut) greift vor dem eigentlichen General an
export interface Vanguard {
    general: string;
    units: CampUnit[];
}

export interface Camp {
    nr: string;
    general: string;
    losses: string;
    units: CampUnit[];
    fk: CampFk[];
    marks: CampMark[];
    vanguard: Vanguard | null;
}

// Textmarken auf der Karte, zu denen es unter „Einheiten“ einen eigenen Eintrag gibt
export type PinKind = "A" | "FK" | "L";

export const PIN_KINDS: Record<PinKind, string> = {
    A: "Aussetzen",
    FK: "Fernkampf",
    L: "Leech",
};

export function pinKind(text: string): PinKind | null {
    const key = text.trim().toUpperCase();

    return key === "A" || key === "FK" || key === "L" ? key : null;
}

export interface Pin {
    t: string;
    x: number;
    y: number;
    general?: string;
    losses?: string;
    units?: CampUnit[];
    fk?: CampFk[];
    note?: string;
}

export interface Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface Shapes {
    pins: Pin[];
    lines: Line[];
}

function fraction(value: unknown): number | null {
    const number = Number(value);

    return number >= 0 && number <= 1 ? Math.round(number * 10000) / 10000 : null;
}

function cleanUnits(raw: unknown, max: number): CampUnit[] {
    const units: CampUnit[] = [];

    if (Array.isArray(raw)) {
        raw.slice(0, max).forEach((value) => {
            const row = value as { unit?: unknown; count?: unknown };
            const count = Math.floor(Number(row.count));

            if (typeof row.unit === "string" && row.unit && count >= 1 && count <= LIMITS.unitCount) {
                units.push({ unit: row.unit, count });
            }
        });
    }

    return units;
}

function cleanFk(raw: unknown, max: number): CampFk[] {
    const fk: CampFk[] = [];

    if (Array.isArray(raw)) {
        raw.slice(0, max).forEach((value) => {
            const row = value as { name?: unknown; count?: unknown };
            const name = String(row.name ?? "").trim().slice(0, LIMITS.fkName);
            const count = Math.floor(Number(row.count));

            if (name && count >= 1 && count <= LIMITS.fkCount) {
                fk.push({ name, count });
            }
        });
    }

    return fk;
}

export function cleanShapes(raw: unknown): Shapes {
    const source = (raw ?? {}) as { pins?: unknown; lines?: unknown };
    const shapes: Shapes = { pins: [], lines: [] };

    if (Array.isArray(source.pins)) {
        source.pins.slice(0, LIMITS.pins).forEach((value) => {
            const pin = value as Record<string, unknown>;
            const t = String(pin.t ?? "").trim().slice(0, LIMITS.pinText);
            const x = fraction(pin.x);
            const y = fraction(pin.y);

            if (!t || x === null || y === null) {
                return;
            }

            const clean: Pin = { t, x, y };
            const kind = pinKind(t);

            if (kind === "A") {
                const note = String(pin.note ?? "").trim().slice(0, LIMITS.pinNote);

                if (note) {
                    clean.note = note;
                }
            } else if (kind === "FK") {
                const fk = cleanFk(pin.fk, LIMITS.campFk);

                if (fk.length) {
                    clean.fk = fk;
                }
            } else if (kind === "L") {
                const general = String(pin.general ?? "").trim().slice(0, LIMITS.campGeneral);
                const losses = String(pin.losses ?? "").trim().slice(0, LIMITS.campLosses);
                const units = cleanUnits(pin.units, LIMITS.campUnits);
                const fk = cleanFk(pin.fk, LIMITS.campFk);

                if (fk.length) {
                    clean.fk = fk;
                }

                if (general) {
                    clean.general = general;
                }

                if (losses) {
                    clean.losses = losses;
                }

                if (units.length) {
                    clean.units = units;
                }
            }

            shapes.pins.push(clean);
        });
    }

    if (Array.isArray(source.lines)) {
        source.lines.slice(0, LIMITS.lines).forEach((value) => {
            const line = value as Record<string, unknown>;
            const [x1, y1, x2, y2] = [line.x1, line.y1, line.x2, line.y2].map(fraction);

            if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                shapes.lines.push({ x1, y1, x2, y2 });
            }
        });
    }

    return shapes;
}

export function cleanCamps(raw: unknown): Camp[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const camps: Camp[] = [];

    raw.slice(0, LIMITS.camps).forEach((item) => {
        const entry = item as {
            nr?: unknown;
            general?: unknown;
            losses?: unknown;
            units?: unknown;
            fk?: unknown;
            marks?: unknown;
            vanguard?: unknown;
        };
        const nr = String(entry.nr ?? "").trim().slice(0, LIMITS.campNr);

        if (!nr) {
            return;
        }

        const units = cleanUnits(entry.units, LIMITS.campUnits);
        const fk = cleanFk(entry.fk, LIMITS.campFk);

        const marks: CampMark[] = [];

        if (Array.isArray(entry.marks)) {
            entry.marks.slice(0, LIMITS.marks).forEach((value) => {
                const mark = value as { x?: unknown; y?: unknown };
                const x = Number(mark.x);
                const y = Number(mark.y);

                if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                    marks.push({ x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 });
                }
            });
        }

        const wave = (entry.vanguard ?? {}) as { general?: unknown; units?: unknown };
        const waveGeneral = String(wave.general ?? "").trim().slice(0, LIMITS.campGeneral);
        const waveUnits = cleanUnits(wave.units, LIMITS.vanguardUnits);

        camps.push({
            nr,
            general: String(entry.general ?? "").trim().slice(0, LIMITS.campGeneral),
            losses: String(entry.losses ?? "").trim().slice(0, LIMITS.campLosses),
            units,
            fk,
            marks,
            vanguard: waveGeneral || waveUnits.length ? { general: waveGeneral, units: waveUnits } : null,
        });
    });

    return camps;
}

export interface TacticMap {
    id: string;
    isStatic: boolean;
    userId: string;
    username: string;
    category: MapCategoryId;
    title: string;
    status: MapStatus;
    template: string;
    camps: Camp[];
    shapes: Shapes;
    specials: string;
    tips: string;
    createdAt: string;
    imagePath: string;
    thumbPath: string;
    imageUrl: string;
    thumbUrl: string;
    downloadUrl: string;
    downloadName: string;
}

export interface MapGeneral {
    id: string;
    note: string;
    build: SkillBuild;
}

interface MapRow {
    id: string;
    user_id: string;
    category: MapCategoryId;
    title: string;
    image_path: string | null;
    thumb_path: string | null;
    template: string | null;
    status: MapStatus;
    camps: unknown;
    shapes: unknown;
    specials: string | null;
    tips: string | null;
    created_at: string;
    profiles: { username: string } | { username: string }[] | null;
}

const BUCKET = "tactic-maps";
const MAP_COLUMNS =
    "id, user_id, category, title, image_path, thumb_path, template, status, camps, shapes, specials, tips, created_at, profiles(username)";
const URL_SECONDS = 60 * 60;

export const STATIC_PREFIX = "statisch-";

function fileName(path: string): string {
    return path.split("/").pop() ?? "karte";
}

function staticMaps(): TacticMap[] {
    return ADVENTURE_MAPS.map((map) => {
        const name = fileName(map.image);

        return {
            id: STATIC_PREFIX + name.replace(/\.[^.]+$/, ""),
            isStatic: true,
            userId: "",
            username: map.author ?? "",
            category: map.category,
            title: map.title,
            status: "approved",
            template: "",
            camps: [],
            shapes: { pins: [], lines: [] },
            specials: "",
            tips: "",
            createdAt: "",
            imagePath: map.image,
            thumbPath: map.image,
            imageUrl: map.image,
            thumbUrl: map.image,
            downloadUrl: map.image,
            downloadName: name,
        };
    });
}

function fromRow(row: MapRow): TacticMap {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    const template = row.template ? findTemplate(row.template) : undefined;
    const source = template?.image ?? "";

    return {
        id: row.id,
        isStatic: false,
        userId: row.user_id,
        username: profile?.username ?? "Unbekannt",
        category: row.category,
        title: row.title,
        status: row.status,
        camps: cleanCamps(row.camps),
        shapes: cleanShapes(row.shapes),
        specials: row.specials ?? "",
        tips: row.tips ?? "",
        createdAt: row.created_at,
        template: row.template ?? "",
        imagePath: row.image_path ?? "",
        thumbPath: row.thumb_path ?? "",
        imageUrl: source,
        thumbUrl: template?.thumb ?? source,
        downloadUrl: source,
        downloadName: source ? fileName(source) : "",
    };
}

async function attachThumbUrls(maps: TacticMap[]): Promise<void> {
    const own = maps.filter((map) => !map.isStatic && !map.template);

    if (!own.length) {
        return;
    }

    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(
        own.map((map) => map.thumbPath),
        URL_SECONDS
    );

    data?.forEach((entry, index) => {
        own[index].thumbUrl = entry.signedUrl ?? "";
    });
}

export async function attachImageUrls(map: TacticMap): Promise<boolean> {
    if (map.isStatic || map.template) {
        return Boolean(map.imageUrl);
    }

    const [view, download] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(map.imagePath, URL_SECONDS),
        supabase.storage.from(BUCKET).createSignedUrl(map.imagePath, URL_SECONDS, {
            download: `${map.title.replace(/[^\p{L}\p{N}]+/gu, "-")}.${map.imagePath.split(".").pop()}`,
        }),
    ]);

    if (!view.data) {
        return false;
    }

    map.imageUrl = view.data.signedUrl;
    map.downloadUrl = download.data?.signedUrl ?? view.data.signedUrl;
    map.downloadName = fileName(map.imagePath);

    return true;
}

let adminCache: { userId: string; value: boolean } | null = null;

export async function isAdmin(): Promise<boolean> {
    const user = await getCurrentUser();

    if (!user) {
        return false;
    }

    if (adminCache?.userId === user.id) {
        return adminCache.value;
    }

    const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    const value = data?.is_admin === true;

    adminCache = { userId: user.id, value };

    return value;
}

export async function listMaps(category: MapCategoryId): Promise<{ maps: TacticMap[]; error?: string }> {
    const fixed = staticMaps().filter((map) => map.category === category);

    const { data, error } = await supabase
        .from("tactic_maps")
        .select(MAP_COLUMNS)
        .eq("category", category)
        .order("created_at", { ascending: false });

    if (error) {
        return { maps: fixed, error: "Die hochgeladenen Taktikkarten konnten nicht geladen werden." };
    }

    const uploaded = (data as unknown as MapRow[]).map(fromRow);

    await attachThumbUrls(uploaded);

    return { maps: [...uploaded, ...fixed] };
}

export async function getMap(id: string): Promise<TacticMap | null> {
    if (id.startsWith(STATIC_PREFIX)) {
        return staticMaps().find((map) => map.id === id) ?? null;
    }

    const { data } = await supabase.from("tactic_maps").select(MAP_COLUMNS).eq("id", id).maybeSingle();

    if (!data) {
        return null;
    }

    const map = fromRow(data as unknown as MapRow);

    return (await attachImageUrls(map)) ? map : null;
}

function translate(error: { code?: string; message: string }): string {
    if (error.code === "P0001") {
        return error.message;
    }
    if (error.code === "23514") {
        return "Eine Eingabe ist zu lang oder ungültig.";
    }
    if (error.code === "23505") {
        return "Das gibt es für diese Karte schon.";
    }
    if (error.code === "42501" || error.message.toLowerCase().includes("row-level security")) {
        return "Dafür hast du keine Berechtigung.";
    }
    return "Das hat nicht geklappt. Bitte versuche es erneut.";
}

export async function createMap(input: {
    category: MapCategoryId;
    title: string;
    image: Blob;
    thumb: Blob;
}): Promise<{ id?: string; approved?: boolean; error?: string }> {
    const user = await getCurrentUser();

    if (!user) {
        return { error: "Du musst angemeldet sein." };
    }

    const id = crypto.randomUUID();
    const ext = input.image.type === "image/png" ? "png" : "webp";
    const thumbExt = input.thumb.type === "image/png" ? "png" : "webp";
    const imagePath = `${user.id}/${id}.${ext}`;
    const thumbPath = `${user.id}/${id}-thumb.${thumbExt}`;
    const bucket = supabase.storage.from(BUCKET);

    const first = await bucket.upload(imagePath, input.image, { contentType: input.image.type });

    if (first.error) {
        return { error: "Das Bild konnte nicht hochgeladen werden." };
    }

    const second = await bucket.upload(thumbPath, input.thumb, { contentType: input.thumb.type });

    if (second.error) {
        await bucket.remove([imagePath]);
        return { error: "Das Vorschaubild konnte nicht hochgeladen werden." };
    }

    const admin = await isAdmin();

    const { error } = await supabase.from("tactic_maps").insert({
        id,
        category: input.category,
        title: input.title,
        image_path: imagePath,
        thumb_path: thumbPath,
        status: admin ? "approved" : "pending",
    });

    if (error) {
        await bucket.remove([imagePath, thumbPath]);
        return { error: translate(error) };
    }

    return { id, approved: admin };
}

export async function createFromTemplate(input: {
    category: MapCategoryId;
    title: string;
    template: string;
}): Promise<{ id?: string; approved?: boolean; error?: string }> {
    if (!findTemplate(input.template)) {
        return { error: "Diese Vorlage gibt es nicht mehr." };
    }

    const id = crypto.randomUUID();
    const admin = await isAdmin();

    const { error } = await supabase.from("tactic_maps").insert({
        id,
        category: input.category,
        title: input.title,
        template: input.template,
        status: admin ? "approved" : "pending",
    });

    return error ? { error: translate(error) } : { id, approved: admin };
}

export async function updateMap(
    id: string,
    patch: Partial<Pick<TacticMap, "title" | "camps" | "shapes" | "specials" | "tips" | "category">>
): Promise<string | null> {
    const { data, error } = await supabase.from("tactic_maps").update(patch).eq("id", id).select("id");

    if (error) {
        return translate(error);
    }

    return data.length ? null : "Dafür hast du keine Berechtigung.";
}

export async function setStatus(id: string, status: MapStatus): Promise<string | null> {
    const { error } = await supabase.rpc("set_tactic_map_status", { p_id: id, p_status: status });

    return error ? translate(error) : null;
}

export async function deleteMap(map: TacticMap): Promise<string | null> {
    const { data, error } = await supabase.from("tactic_maps").delete().eq("id", map.id).select("id");

    if (error) {
        return translate(error);
    }

    if (!data.length) {
        return "Dafür hast du keine Berechtigung.";
    }

    if (!map.template) {
        await supabase.storage.from(BUCKET).remove([map.imagePath, map.thumbPath]);
    }

    return null;
}

export async function loadGenerals(mapId: string): Promise<{ generals: MapGeneral[]; error?: string }> {
    const { data, error } = await supabase
        .from("tactic_map_generals")
        .select(`id, note, skill_builds(${BUILD_COLUMNS})`)
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });

    if (error) {
        return { generals: [], error: "Die Generäle konnten nicht geladen werden." };
    }

    const rows = data as unknown as {
        id: string;
        note: string;
        skill_builds: SkillBuildRow | SkillBuildRow[] | null;
    }[];

    const generals: MapGeneral[] = [];

    rows.forEach((row) => {
        const raw = Array.isArray(row.skill_builds) ? row.skill_builds[0] : row.skill_builds;
        const build = raw ? buildFromRow(raw) : null;

        if (build) {
            generals.push({ id: row.id, note: row.note, build });
        }
    });

    return { generals };
}

export async function addGeneral(mapId: string, buildId: string, note: string): Promise<string | null> {
    const { error } = await supabase.from("tactic_map_generals").insert({ map_id: mapId, build_id: buildId, note });

    return error ? translate(error) : null;
}

export async function removeGeneral(id: string): Promise<string | null> {
    const { error } = await supabase.from("tactic_map_generals").delete().eq("id", id);

    return error ? translate(error) : null;
}

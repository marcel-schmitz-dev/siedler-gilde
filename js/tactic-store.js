import { ADVENTURE_MAPS } from "./data/adventure-maps.js";
import { findTemplate } from "./data/map-templates.js";
import { BUILD_COLUMNS, buildFromRow, getCurrentUser } from "./skill-builds.js";
import { supabase } from "./supabase.js";
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
export const PIN_KINDS = {
    A: "Aussetzen",
    FK: "Fernkampf",
    L: "Leech",
};
export function pinKind(text) {
    const key = text.trim().toUpperCase();
    return key === "A" || key === "FK" || key === "L" ? key : null;
}
function fraction(value) {
    const number = Number(value);
    return number >= 0 && number <= 1 ? Math.round(number * 10000) / 10000 : null;
}
function cleanUnits(raw, max) {
    const units = [];
    if (Array.isArray(raw)) {
        raw.slice(0, max).forEach((value) => {
            const row = value;
            const count = Math.floor(Number(row.count));
            if (typeof row.unit === "string" && row.unit && count >= 1 && count <= LIMITS.unitCount) {
                units.push({ unit: row.unit, count });
            }
        });
    }
    return units;
}
function cleanFk(raw, max) {
    const fk = [];
    if (Array.isArray(raw)) {
        raw.slice(0, max).forEach((value) => {
            const row = value;
            const name = String(row.name ?? "").trim().slice(0, LIMITS.fkName);
            const count = Math.floor(Number(row.count));
            if (name && count >= 1 && count <= LIMITS.fkCount) {
                fk.push({ name, count });
            }
        });
    }
    return fk;
}
export function cleanShapes(raw) {
    const source = (raw ?? {});
    const shapes = { pins: [], lines: [] };
    if (Array.isArray(source.pins)) {
        source.pins.slice(0, LIMITS.pins).forEach((value) => {
            const pin = value;
            const t = String(pin.t ?? "").trim().slice(0, LIMITS.pinText);
            const x = fraction(pin.x);
            const y = fraction(pin.y);
            if (!t || x === null || y === null) {
                return;
            }
            const clean = { t, x, y };
            const kind = pinKind(t);
            if (kind === "A") {
                const note = String(pin.note ?? "").trim().slice(0, LIMITS.pinNote);
                if (note) {
                    clean.note = note;
                }
            }
            else if (kind === "FK") {
                const fk = cleanFk(pin.fk, LIMITS.campFk);
                if (fk.length) {
                    clean.fk = fk;
                }
            }
            else if (kind === "L") {
                const general = String(pin.general ?? "").trim().slice(0, LIMITS.campGeneral);
                const losses = String(pin.losses ?? "").trim().slice(0, LIMITS.campLosses);
                const units = cleanUnits(pin.units, LIMITS.campUnits);
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
            const line = value;
            const [x1, y1, x2, y2] = [line.x1, line.y1, line.x2, line.y2].map(fraction);
            if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                shapes.lines.push({ x1, y1, x2, y2 });
            }
        });
    }
    return shapes;
}
export function cleanCamps(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }
    const camps = [];
    raw.slice(0, LIMITS.camps).forEach((item) => {
        const entry = item;
        const nr = String(entry.nr ?? "").trim().slice(0, LIMITS.campNr);
        if (!nr) {
            return;
        }
        const units = cleanUnits(entry.units, LIMITS.campUnits);
        const fk = cleanFk(entry.fk, LIMITS.campFk);
        const marks = [];
        if (Array.isArray(entry.marks)) {
            entry.marks.slice(0, LIMITS.marks).forEach((value) => {
                const mark = value;
                const x = Number(mark.x);
                const y = Number(mark.y);
                if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
                    marks.push({ x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 });
                }
            });
        }
        const wave = (entry.vanguard ?? {});
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
const BUCKET = "tactic-maps";
const MAP_COLUMNS = "id, user_id, category, title, image_path, thumb_path, template, status, camps, shapes, specials, tips, created_at, profiles(username)";
const URL_SECONDS = 60 * 60;
export const STATIC_PREFIX = "statisch-";
function fileName(path) {
    return path.split("/").pop() ?? "karte";
}
function staticMaps() {
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
function fromRow(row) {
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
async function attachThumbUrls(maps) {
    const own = maps.filter((map) => !map.isStatic && !map.template);
    if (!own.length) {
        return;
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(own.map((map) => map.thumbPath), URL_SECONDS);
    data?.forEach((entry, index) => {
        own[index].thumbUrl = entry.signedUrl ?? "";
    });
}
export async function attachImageUrls(map) {
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
let adminCache = null;
export async function isAdmin() {
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
export async function listMaps(category) {
    const fixed = staticMaps().filter((map) => map.category === category);
    const { data, error } = await supabase
        .from("tactic_maps")
        .select(MAP_COLUMNS)
        .eq("category", category)
        .order("created_at", { ascending: false });
    if (error) {
        return { maps: fixed, error: "Die hochgeladenen Taktikkarten konnten nicht geladen werden." };
    }
    const uploaded = data.map(fromRow);
    await attachThumbUrls(uploaded);
    return { maps: [...uploaded, ...fixed] };
}
export async function getMap(id) {
    if (id.startsWith(STATIC_PREFIX)) {
        return staticMaps().find((map) => map.id === id) ?? null;
    }
    const { data } = await supabase.from("tactic_maps").select(MAP_COLUMNS).eq("id", id).maybeSingle();
    if (!data) {
        return null;
    }
    const map = fromRow(data);
    return (await attachImageUrls(map)) ? map : null;
}
function translate(error) {
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
export async function createMap(input) {
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
export async function createFromTemplate(input) {
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
export async function updateMap(id, patch) {
    const { data, error } = await supabase.from("tactic_maps").update(patch).eq("id", id).select("id");
    if (error) {
        return translate(error);
    }
    return data.length ? null : "Dafür hast du keine Berechtigung.";
}
export async function setStatus(id, status) {
    const { error } = await supabase.rpc("set_tactic_map_status", { p_id: id, p_status: status });
    return error ? translate(error) : null;
}
export async function deleteMap(map) {
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
export async function loadGenerals(mapId) {
    const { data, error } = await supabase
        .from("tactic_map_generals")
        .select(`id, note, skill_builds(${BUILD_COLUMNS})`)
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
    if (error) {
        return { generals: [], error: "Die Generäle konnten nicht geladen werden." };
    }
    const rows = data;
    const generals = [];
    rows.forEach((row) => {
        const raw = Array.isArray(row.skill_builds) ? row.skill_builds[0] : row.skill_builds;
        const build = raw ? buildFromRow(raw) : null;
        if (build) {
            generals.push({ id: row.id, note: row.note, build });
        }
    });
    return { generals };
}
export async function addGeneral(mapId, buildId, note) {
    const { error } = await supabase.from("tactic_map_generals").insert({ map_id: mapId, build_id: buildId, note });
    return error ? translate(error) : null;
}
export async function removeGeneral(id) {
    const { error } = await supabase.from("tactic_map_generals").delete().eq("id", id);
    return error ? translate(error) : null;
}
//# sourceMappingURL=tactic-store.js.map
-- =========================================================
-- Gründer von Goldenau: Skillungen der Mitglieder (Generäle, Entdecker, Geologen)
-- Im Supabase-Dashboard: SQL Editor -> New query -> einfügen -> Run
-- Voraussetzung: Tabelle public.profiles aus supabase-setup.sql existiert.
-- Falls du die erste Version schon ausgeführt hast, vorher:  drop table public.skill_builds;
-- =========================================================

-- Prüft die Skillung serverseitig (zusätzlich zur Prüfung im Browser):
--   20 Stufen als Zahlen 0..3, oberste Reihe max. 1 (General/Entdecker: 4 Felder, Geologe: 3 Felder),
--   Summe höchstens 21 (General, Entdecker) bzw. 31 (Geologe),
--   Freischaltung: Reihe r braucht 5*(r-1) Bücher in den Reihen darunter.
create or replace function public.skill_levels_ok(p_type text, p_skills jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_lv     int[] := '{}';
  v_per    int;   -- Felder pro Reihe (Geologe 3, sonst 4)
  v_rows   int;   -- Anzahl Reihen (Geologe 7, sonst 5)
  v_single int;   -- Felder mit Maximalstufe 1 (oberste Reihe)
  v_limit  int;   -- Punkte-/Bücherlimit
  v_sum    int := 0;
  v_max    int;   -- Maximalstufe des aktuellen Felds
  v_row    int;
  v_below  int;
  i        int;
  j        int;
begin
  if p_type not in ('general', 'explorer', 'geologist') then
    return false;
  end if;
  if jsonb_typeof(p_skills) is distinct from 'array' or jsonb_array_length(p_skills) <> 20 then
    return false;
  end if;

  if p_type = 'geologist' then
    v_per := 3; v_rows := 7; v_single := 3; v_limit := 31;
  else
    v_per := 4; v_rows := 5; v_single := 4; v_limit := 21;
  end if;

  -- Jede Stufe: Zahl 0..3, oberste Reihe höchstens 1
  for i in 1..20 loop
    if jsonb_typeof(p_skills -> (i - 1)) is distinct from 'number'
       or (p_skills ->> (i - 1)) !~ '^[0-3]$' then
      return false;
    end if;
    v_lv[i] := (p_skills ->> (i - 1))::int;
    if i <= v_single then
      v_max := 1;
    else
      v_max := 3;
    end if;
    if v_lv[i] > v_max then
      return false;
    end if;
    v_sum := v_sum + v_lv[i];
  end loop;

  if v_sum > v_limit then
    return false;
  end if;

  -- Freischaltung: Reihe r braucht 5*(r-1) Bücher in den Reihen darunter (Reihe 1 = unten)
  for i in 1..20 loop
    if v_lv[i] > 0 then
      v_row := v_rows - ((i - 1) / v_per);
      if v_row > 1 then
        v_below := 0;
        for j in 1..20 loop
          if v_rows - ((j - 1) / v_per) < v_row then
            v_below := v_below + v_lv[j];
          end if;
        end loop;
        if v_below < 5 * (v_row - 1) then
          return false;
        end if;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

create table public.skill_builds (
  id          uuid primary key default gen_random_uuid(),
  -- Ersteller = eingeloggtes Mitglied; der Name kommt aus profiles.username
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  unit_type   text not null check (unit_type in ('general', 'explorer', 'geologist')),
  unit_slug   text not null check (char_length(unit_slug) between 1 and 80),
  -- Zusatz/Verwendungszweck, z. B. "Schatzsuche lang" oder "Abenteuer-Bosse".
  -- Pro Mitglied und Spezialist muss er sich unterscheiden (leer = die "Standard"-Skillung).
  title       text not null default '' check (char_length(title) <= 40),
  -- 20 Stufen in der Reihenfolge des Skillbaums, z. B. [0,1,0,0,3,...]
  skills      jsonb not null,
  created_at  timestamptz not null default now(),
  constraint skill_builds_levels_ok check (public.skill_levels_ok(unit_type, skills))
);

create unique index skill_builds_unique_title
  on public.skill_builds (user_id, unit_type, unit_slug, lower(title));
create index skill_builds_unit_idx on public.skill_builds (unit_type, unit_slug);

alter table public.skill_builds enable row level security;

-- Alle eingeloggten Mitglieder dürfen alle Skillungen sehen
create policy "Skillungen lesen (eingeloggt)"
  on public.skill_builds for select
  to authenticated
  using (true);

-- Anlegen nur im eigenen Namen
create policy "Eigene Skillung anlegen"
  on public.skill_builds for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Ändern und löschen nur die eigenen
create policy "Eigene Skillung ändern"
  on public.skill_builds for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Eigene Skillung löschen"
  on public.skill_builds for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Abfrage im Frontend mit Ersteller-Namen (Join über den Fremdschlüssel):
--   supabase.from("skill_builds")
--     .select("id, unit_type, unit_slug, title, skills, created_at, profiles(username)")
--     .order("created_at", { ascending: false })

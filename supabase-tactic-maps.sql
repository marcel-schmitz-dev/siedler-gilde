-- =========================================================
-- Gründer von Goldenau: Taktikkarten (AT) mit Generälen, Einheiten, Besonderheiten und Tipps
-- Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run
-- Voraussetzung: profiles (supabase-setup.sql) und skill_builds (supabase-skill-builds.sql) existieren.
-- Danach unten die Testabfragen ausführen.
-- =========================================================


-- ---------------------------------------------------------
-- 1) Admin-Flag in profiles
-- ---------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Mitglieder dürfen an ihrem Profil nur noch den Namen ändern, sonst könnte sich jeder selbst zum Admin machen
revoke update on public.profiles from anon, authenticated;
grant update (username) on public.profiles to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Dein Konto zum Admin machen: Benutzernamen eintragen und diese Zeile einmal ausführen
-- update public.profiles set is_admin = true where username = 'DEIN_BENUTZERNAME';


-- ---------------------------------------------------------
-- 2) Tabelle tactic_maps
-- ---------------------------------------------------------
create table public.tactic_maps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category    text not null check (category in ('klassisch', 'maerchen', 'szenario', 'unternehmungen', 'koop')),
  title       text not null check (char_length(btrim(title)) between 3 and 60),
  -- Dateien liegen im Bucket "tactic-maps" im Ordner der Benutzer-ID
  image_path  text not null check (char_length(image_path) <= 200 and image_path like user_id::text || '/%'),
  thumb_path  text not null check (char_length(thumb_path) <= 200 and thumb_path like user_id::text || '/%'),
  status      text not null default 'pending' check (status in ('pending', 'approved')),
  -- Lager: [{"nr": "1", "general": "Ent.", "units": [{"unit": "schwertkaempfer", "count": 50}]}]
  camps       jsonb not null default '[]'::jsonb check (
    case
      when jsonb_typeof(camps) = 'array'
        then jsonb_array_length(camps) <= 30 and char_length(camps::text) <= 30000
      else false
    end
  ),
  specials    text not null default '' check (char_length(specials) <= 1500),
  tips        text not null default '' check (char_length(tips) <= 1500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tactic_maps_category_idx on public.tactic_maps (category, status);
create index tactic_maps_user_idx on public.tactic_maps (user_id);

-- Höchstens 10 Karten pro Mitglied gleichzeitig in der Freigabe (Admins ausgenommen)
create or replace function public.tactic_maps_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending int;
begin
  if not public.is_admin() then
    select count(*) into v_pending
    from public.tactic_maps m
    where m.user_id = new.user_id and m.status = 'pending';

    if v_pending >= 10 then
      raise exception 'Es warten schon 10 deiner Karten auf Freigabe.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger tactic_maps_before_insert
  before insert on public.tactic_maps
  for each row execute function public.tactic_maps_before_insert();

create or replace function public.tactic_maps_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tactic_maps_touch
  before update on public.tactic_maps
  for each row execute function public.tactic_maps_touch();

alter table public.tactic_maps enable row level security;

-- Freigegebene Karten sehen alle eingeloggten Mitglieder, die eigenen und für den Admin alle
create policy "Taktikkarten lesen"
  on public.tactic_maps for select
  to authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or public.is_admin());

-- Neue Karten sind zuerst "pending", nur der Admin darf direkt freigegeben anlegen
create policy "Taktikkarte anlegen"
  on public.tactic_maps for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (status = 'pending' or public.is_admin())
  );

create policy "Taktikkarte ändern"
  on public.tactic_maps for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy "Taktikkarte löschen"
  on public.tactic_maps for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Spalten-Rechte: status, user_id und Dateipfade lassen sich nach dem Anlegen nicht mehr ändern
revoke all on public.tactic_maps from anon, authenticated;
grant select, insert, delete on public.tactic_maps to authenticated;
grant update (category, title, camps, specials, tips) on public.tactic_maps to authenticated;

-- Freigabe nur über diese Funktion
create or replace function public.set_tactic_map_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Das darf nur der Admin.' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'approved') then
    raise exception 'Ungültiger Status.' using errcode = '22023';
  end if;

  update public.tactic_maps set status = p_status where id = p_id;

  if not found then
    raise exception 'Karte nicht gefunden.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_tactic_map_status(uuid, text) from public, anon;
grant execute on function public.set_tactic_map_status(uuid, text) to authenticated;


-- ---------------------------------------------------------
-- 3) Generäle pro Taktikkarte (Verknüpfung mit Skillungen)
-- ---------------------------------------------------------
create table public.tactic_map_generals (
  id          uuid primary key default gen_random_uuid(),
  map_id      uuid not null references public.tactic_maps (id) on delete cascade,
  build_id    uuid not null references public.skill_builds (id) on delete cascade,
  note        text not null default '' check (char_length(note) <= 200),
  created_at  timestamptz not null default now(),
  unique (map_id, build_id)
);

create index tactic_map_generals_map_idx on public.tactic_map_generals (map_id);
create index tactic_map_generals_build_idx on public.tactic_map_generals (build_id);

-- Nur Skillungen von Generälen, höchstens 8 pro Karte
create or replace function public.tactic_map_generals_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not exists (
    select 1 from public.skill_builds b
    where b.id = new.build_id and b.unit_type = 'general'
  ) then
    raise exception 'Es sind nur Skillungen von Generälen erlaubt.' using errcode = 'P0001';
  end if;

  select count(*) into v_count
  from public.tactic_map_generals g
  where g.map_id = new.map_id;

  if v_count >= 8 then
    raise exception 'Höchstens 8 Generäle pro Taktikkarte.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger tactic_map_generals_before_insert
  before insert on public.tactic_map_generals
  for each row execute function public.tactic_map_generals_before_insert();

alter table public.tactic_map_generals enable row level security;

-- Sichtbar ist, was zu einer für das Mitglied sichtbaren Karte gehört (die RLS von tactic_maps greift in der Unterabfrage)
create policy "Generäle der Taktikkarte lesen"
  on public.tactic_map_generals for select
  to authenticated
  using (
    exists (
      select 1 from public.tactic_maps m
      where m.id = tactic_map_generals.map_id
    )
  );

create policy "Generäle der Taktikkarte anlegen"
  on public.tactic_map_generals for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tactic_maps m
      where m.id = tactic_map_generals.map_id
        and (m.user_id = (select auth.uid()) or public.is_admin())
    )
  );

create policy "Generäle der Taktikkarte ändern"
  on public.tactic_map_generals for update
  to authenticated
  using (
    exists (
      select 1 from public.tactic_maps m
      where m.id = tactic_map_generals.map_id
        and (m.user_id = (select auth.uid()) or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.tactic_maps m
      where m.id = tactic_map_generals.map_id
        and (m.user_id = (select auth.uid()) or public.is_admin())
    )
  );

create policy "Generäle der Taktikkarte löschen"
  on public.tactic_map_generals for delete
  to authenticated
  using (
    exists (
      select 1 from public.tactic_maps m
      where m.id = tactic_map_generals.map_id
        and (m.user_id = (select auth.uid()) or public.is_admin())
    )
  );

revoke all on public.tactic_map_generals from anon, authenticated;
grant select, insert, delete on public.tactic_map_generals to authenticated;
grant update (note) on public.tactic_map_generals to authenticated;


-- ---------------------------------------------------------
-- 4) Storage: privater Bucket "tactic-maps"
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tactic-maps', 'tactic-maps', false, 5242880, array['image/webp', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lesen: eigener Ordner, Admin oder Datei einer freigegebenen Karte
create policy "Taktikkarten-Dateien lesen"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tactic-maps'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
      or exists (
        select 1 from public.tactic_maps m
        where m.status = 'approved'
          and (m.image_path = storage.objects.name or m.thumb_path = storage.objects.name)
      )
    )
  );

-- Schreiben nur im eigenen Ordner (Größe und Dateityp begrenzt der Bucket)
create policy "Taktikkarten-Dateien hochladen"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tactic-maps'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Taktikkarten-Dateien löschen"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tactic-maps'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
    )
  );


-- =========================================================
-- TESTABFRAGEN
-- Jeweils einzeln markieren und ausführen.
-- =========================================================

-- Test 1: Gibt es alles? (erwartet: 3 Zeilen mit ok = true)
-- select 'tactic_maps' as name, to_regclass('public.tactic_maps') is not null as ok
-- union all select 'tactic_map_generals', to_regclass('public.tactic_map_generals') is not null
-- union all select 'bucket tactic-maps', exists (select 1 from storage.buckets where id = 'tactic-maps' and public = false);

-- Test 2: Policies (erwartet: 4 + 4 + 3 Zeilen)
-- select tablename, policyname, cmd from pg_policies
-- where (schemaname = 'public' and tablename in ('tactic_maps', 'tactic_map_generals'))
--    or (schemaname = 'storage' and policyname like 'Taktikkarten-Dateien%')
-- order by tablename, cmd;

-- Test 3: Spalten, die Mitglieder ändern dürfen (erwartet: category, title, camps, specials, tips, note, username)
-- select table_name, column_name from information_schema.column_privileges
-- where grantee = 'authenticated' and privilege_type = 'UPDATE'
--   and table_name in ('tactic_maps', 'tactic_map_generals', 'profiles')
-- order by table_name, column_name;

-- Test 4: Nur du bist Admin (erwartet: genau 1 Zeile mit deinem Namen)
-- select username from public.profiles where is_admin;

-- Test 5: Ablauftest mit Rollen. Er legt Testdaten an und rollt am Ende alles zurück,
-- die Meldung unten im Ergebnisfenster ("Alle Tests bestanden ...") erscheint als Fehlermeldung, das ist gewollt.
-- Braucht dein Admin-Konto (Test 4) und mindestens ein weiteres Konto.
--
-- do $$
-- declare
--   v_admin  uuid;
--   v_user   uuid;
--   v_other  uuid;
--   v_map    uuid;
--   v_build  uuid;
--   v_count  int;
--   v_failed boolean;
-- begin
--   select id into v_admin from public.profiles where is_admin limit 1;
--   select id into v_user  from public.profiles where not is_admin order by created_at limit 1;
--   select id into v_other from public.profiles where not is_admin and id <> v_user order by created_at limit 1;
--
--   if v_admin is null or v_user is null then
--     raise exception 'Test braucht ein Admin-Konto und ein weiteres Konto.';
--   end if;
--
--   -- als normales Mitglied
--   perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
--   set local role authenticated;
--
--   -- a) direkt freigegeben anlegen muss scheitern
--   v_failed := false;
--   begin
--     insert into public.tactic_maps (category, title, image_path, thumb_path, status)
--     values ('koop', 'Testkarte', v_user || '/t.webp', v_user || '/t-thumb.webp', 'approved');
--   exception when insufficient_privilege then
--     v_failed := true;
--   end;
--   if not v_failed then raise exception 'FEHLER a: Mitglied konnte eine Karte freigegeben anlegen'; end if;
--
--   -- b) normal anlegen klappt und ist pending
--   insert into public.tactic_maps (category, title, image_path, thumb_path)
--   values ('koop', 'Testkarte', v_user || '/t.webp', v_user || '/t-thumb.webp')
--   returning id into v_map;
--   select count(*) into v_count from public.tactic_maps where id = v_map and status = 'pending';
--   if v_count <> 1 then raise exception 'FEHLER b: Karte nicht pending angelegt'; end if;
--
--   -- c) Status selbst ändern muss scheitern
--   v_failed := false;
--   begin
--     update public.tactic_maps set status = 'approved' where id = v_map;
--   exception when insufficient_privilege then
--     v_failed := true;
--   end;
--   if not v_failed then raise exception 'FEHLER c: Mitglied konnte den Status ändern'; end if;
--
--   -- d) Titel und Texte ändern klappt
--   update public.tactic_maps
--   set title = 'Testkarte neu', tips = 'Ein Tipp',
--       camps = '[{"nr": "1", "general": "Ent.", "units": [{"unit": "soldat", "count": 50}]}]'::jsonb
--   where id = v_map;
--   select count(*) into v_count from public.tactic_maps where id = v_map and title = 'Testkarte neu';
--   if v_count <> 1 then raise exception 'FEHLER d: Titel nicht geändert'; end if;
--
--   -- e) Freigabe-Funktion darf ein Mitglied nicht aufrufen
--   v_failed := false;
--   begin
--     perform public.set_tactic_map_status(v_map, 'approved');
--   exception when insufficient_privilege then
--     v_failed := true;
--   end;
--   if not v_failed then raise exception 'FEHLER e: Mitglied konnte freigeben'; end if;
--
--   -- f) ein anderes Mitglied sieht die Karte noch nicht
--   if v_other is not null then
--     perform set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
--     select count(*) into v_count from public.tactic_maps where id = v_map;
--     if v_count <> 0 then raise exception 'FEHLER f: fremdes Mitglied sieht eine Karte in der Freigabe'; end if;
--   end if;
--
--   -- g) Admin sieht sie und gibt frei
--   perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
--   select count(*) into v_count from public.tactic_maps where id = v_map;
--   if v_count <> 1 then raise exception 'FEHLER g: Admin sieht die Karte nicht'; end if;
--   perform public.set_tactic_map_status(v_map, 'approved');
--
--   -- h) jetzt sieht das andere Mitglied sie
--   if v_other is not null then
--     perform set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
--     select count(*) into v_count from public.tactic_maps where id = v_map and status = 'approved';
--     if v_count <> 1 then raise exception 'FEHLER h: freigegebene Karte nicht sichtbar'; end if;
--
--     -- i) das andere Mitglied darf nichts daran ändern (0 Zeilen, kein Fehler)
--     update public.tactic_maps set title = 'Fremd' where id = v_map;
--     get diagnostics v_count = row_count;
--     if v_count <> 0 then raise exception 'FEHLER i: fremdes Mitglied konnte die Karte ändern'; end if;
--   end if;
--
--   -- j) Generäle: Ersteller verknüpft eine Skillung, doppelt scheitert
--   perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
--   select id into v_build from public.skill_builds where unit_type = 'general' limit 1;
--   if v_build is not null then
--     insert into public.tactic_map_generals (map_id, build_id, note) values (v_map, v_build, 'Test');
--     v_failed := false;
--     begin
--       insert into public.tactic_map_generals (map_id, build_id) values (v_map, v_build);
--     exception when unique_violation then
--       v_failed := true;
--     end;
--     if not v_failed then raise exception 'FEHLER j: doppelte Verknüpfung möglich'; end if;
--   end if;
--
--   raise exception 'Alle Tests bestanden (Änderungen wurden zurückgerollt).';
-- end;
-- $$;

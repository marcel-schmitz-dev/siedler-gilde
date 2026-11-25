-- =========================================================
-- Taktikkarten: Vorlagen (freigestellte Blanko-Karten aus ts/data/map-templates.ts)
-- Eine Karte hat jetzt entweder eine eigene Datei im Storage oder eine Vorlage.
-- Nur nötig, wenn supabase-tactic-maps.sql schon ausgeführt wurde (neue Installationen haben das bereits).
-- Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run
-- =========================================================

alter table public.tactic_maps add column if not exists template text;

alter table public.tactic_maps alter column image_path drop not null;
alter table public.tactic_maps alter column thumb_path drop not null;

-- die alten Einzelregeln zu image_path und thumb_path ersetzt die gemeinsame Regel unten
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.tactic_maps'::regclass
      and contype = 'c'
      and conname <> 'tactic_maps_source_check'
      and (pg_get_constraintdef(oid) like '%image_path%' or pg_get_constraintdef(oid) like '%thumb_path%')
  loop
    execute format('alter table public.tactic_maps drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.tactic_maps drop constraint if exists tactic_maps_source_check;

alter table public.tactic_maps
  add constraint tactic_maps_source_check check (
    coalesce(
      (template is not null and char_length(template) <= 80 and image_path is null and thumb_path is null)
      or (
        template is null
        and image_path is not null and thumb_path is not null
        and char_length(image_path) <= 200 and char_length(thumb_path) <= 200
        and image_path like user_id::text || '/%'
        and thumb_path like user_id::text || '/%'
      ),
      false
    )
  );


-- Testabfragen, jeweils einzeln ausführen

-- Test A: Spalte da, Pfade dürfen leer sein (erwartet: image_path, thumb_path, template mit is_nullable = YES)
-- select column_name, is_nullable from information_schema.columns
-- where table_schema = 'public' and table_name = 'tactic_maps' and column_name in ('image_path', 'thumb_path', 'template');

-- Test B: Regeln (erwartet: tactic_maps_source_check, dazu die Regeln für Titel, Status, Texte und camps, aber keine zu image_path oder thumb_path)
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.tactic_maps'::regclass and contype = 'c' order by conname;

-- Test C: Vorlage geht, Mischform und fehlende Quelle gehen nicht (erwartet am Ende die Meldung "Alle Tests bestanden", alles wird zurückgerollt)
-- do $$
-- declare
--   v_user   uuid;
--   v_failed boolean;
-- begin
--   select id into v_user from public.profiles limit 1;
--
--   insert into public.tactic_maps (user_id, category, title, template)
--   values (v_user, 'koop', 'Vorlagentest', 'test-vorlage');
--
--   v_failed := false;
--   begin
--     insert into public.tactic_maps (user_id, category, title, template, image_path, thumb_path)
--     values (v_user, 'koop', 'Mischform', 'test-vorlage', v_user || '/a.webp', v_user || '/a-thumb.webp');
--   exception when check_violation then
--     v_failed := true;
--   end;
--   if not v_failed then raise exception 'FEHLER: Vorlage und Datei gleichzeitig erlaubt'; end if;
--
--   v_failed := false;
--   begin
--     insert into public.tactic_maps (user_id, category, title)
--     values (v_user, 'koop', 'Ohne Quelle');
--   exception when check_violation then
--     v_failed := true;
--   end;
--   if not v_failed then raise exception 'FEHLER: Karte ohne Quelle erlaubt'; end if;
--
--   raise exception 'Alle Tests bestanden (Änderungen wurden zurückgerollt).';
-- end;
-- $$;

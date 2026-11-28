-- =========================================================
-- Taktikkarten: Zusatzangaben zu den Textmarken A, FK und L
-- Die Angaben (Fernkampf, Leech-Einheiten, Hinweis zu A) liegen in derselben Spalte shapes,
-- es ändert sich nur die Größenregel. Die Vorwelle der Lager steckt in der Spalte camps
-- und braucht keine Änderung.
-- Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run
-- =========================================================

alter table public.tactic_maps drop constraint if exists tactic_maps_shapes_check;

alter table public.tactic_maps
  add constraint tactic_maps_shapes_check check (
    jsonb_typeof(shapes) = 'object' and char_length(shapes::text) <= 40000
  );


-- Testabfragen, jeweils einzeln ausführen

-- Test A: Regel vorhanden (erwartet: 1 Zeile, die Definition enthält 40000)
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'tactic_maps_shapes_check';

-- Test B: Prüfregel greift weiter (erwartet: Fehler "violates check constraint tactic_maps_shapes_check", alles wird zurückgerollt)
-- do $$
-- declare v_user uuid;
-- begin
--   select id into v_user from public.profiles limit 1;
--   insert into public.tactic_maps (user_id, category, title, template, shapes)
--   values (v_user, 'koop', 'Test', 'test-vorlage', '[1, 2]'::jsonb);
-- end;
-- $$;

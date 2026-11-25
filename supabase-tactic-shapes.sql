-- =========================================================
-- Taktikkarten: Positionen (P1, P2 ...), Beschriftungen (A, FK ...) und Linien auf der Karte
-- Nur nötig, wenn supabase-tactic-maps.sql schon ausgeführt wurde (neue Installationen haben die Spalte bereits).
-- Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run
-- =========================================================

alter table public.tactic_maps
  add column if not exists shapes jsonb not null default '{"pins": [], "lines": []}'::jsonb;

alter table public.tactic_maps drop constraint if exists tactic_maps_shapes_check;

alter table public.tactic_maps
  add constraint tactic_maps_shapes_check check (
    jsonb_typeof(shapes) = 'object' and char_length(shapes::text) <= 20000
  );

-- Spalten-Rechte neu setzen (REVOKE nimmt auch die Spaltenrechte zurück)
revoke update on public.tactic_maps from authenticated;
grant update (category, title, camps, shapes, specials, tips) on public.tactic_maps to authenticated;


-- Testabfragen, jeweils einzeln ausführen

-- Test A: Spalte da (erwartet: 1 Zeile, data_type jsonb)
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'tactic_maps' and column_name = 'shapes';

-- Test B: Änderbare Spalten (erwartet: camps, category, shapes, specials, tips, title)
-- select column_name from information_schema.column_privileges
-- where grantee = 'authenticated' and privilege_type = 'UPDATE' and table_name = 'tactic_maps'
-- order by column_name;

-- Test C: Prüfregel greift (erwartet: Fehler "violates check constraint tactic_maps_shapes_check", alles wird zurückgerollt)
-- do $$
-- declare v_user uuid;
-- begin
--   select id into v_user from public.profiles limit 1;
--   insert into public.tactic_maps (user_id, category, title, template, shapes)
--   values (v_user, 'koop', 'Test', 'test-vorlage', '[1, 2]'::jsonb);
-- end;
-- $$;

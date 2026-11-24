-- =========================================================
-- Taktikkarten: Einheitenliste durch Lager-Tabelle ersetzen
-- Nur nötig, wenn supabase-tactic-maps.sql schon ausgeführt wurde (neue Installationen haben die Spalte camps bereits).
-- Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run
-- =========================================================

alter table public.tactic_maps drop column if exists units;

alter table public.tactic_maps
  add column if not exists camps jsonb not null default '[]'::jsonb;

alter table public.tactic_maps drop constraint if exists tactic_maps_camps_check;

alter table public.tactic_maps
  add constraint tactic_maps_camps_check check (
    case
      when jsonb_typeof(camps) = 'array'
        then jsonb_array_length(camps) <= 30 and char_length(camps::text) <= 30000
      else false
    end
  );

-- Spalten-Rechte neu setzen (REVOKE nimmt auch die Spaltenrechte zurück)
revoke update on public.tactic_maps from authenticated;
grant update (category, title, camps, specials, tips) on public.tactic_maps to authenticated;


-- Testabfragen, jeweils einzeln ausführen

-- Test A: Spalte camps da, units weg (erwartet: 1 Zeile camps, jsonb)
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'tactic_maps' and column_name in ('camps', 'units');

-- Test B: Änderbare Spalten (erwartet: category, title, camps, specials, tips)
-- select column_name from information_schema.column_privileges
-- where grantee = 'authenticated' and privilege_type = 'UPDATE' and table_name = 'tactic_maps'
-- order by column_name;

-- Test C: Prüfregel greift (erwartet: Fehler "violates check constraint tactic_maps_camps_check", alles wird zurückgerollt)
-- do $$
-- declare v_user uuid;
-- begin
--   select id into v_user from public.profiles limit 1;
--   insert into public.tactic_maps (user_id, category, title, image_path, thumb_path, camps)
--   values (v_user, 'koop', 'Test', v_user || '/a.webp', v_user || '/a-thumb.webp', '{"kein": "array"}'::jsonb);
-- end;
-- $$;

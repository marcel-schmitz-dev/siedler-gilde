-- =========================================================
-- Taktikkarten: Platz für Lager-Markierungen auf der Karte
-- Die Markierungen (Anteil von Breite und Höhe) liegen in derselben Spalte camps, es ändert sich nur die Größenregel.
-- Nur nötig, wenn supabase-tactic-camps.sql schon ausgeführt wurde (neue Installationen haben die Regel bereits).
-- Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run
-- =========================================================

alter table public.tactic_maps drop constraint if exists tactic_maps_camps_check;

alter table public.tactic_maps
  add constraint tactic_maps_camps_check check (
    case
      when jsonb_typeof(camps) = 'array'
        then jsonb_array_length(camps) <= 30 and char_length(camps::text) <= 30000
      else false
    end
  );

-- Test: Regel vorhanden (erwartet: 1 Zeile, die Definition enthält 30000)
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'tactic_maps_camps_check';

-- =========================================================
-- Update der Prüf-Funktion für skill_builds (Tabelle und Daten bleiben bestehen).
-- Ergänzt die Freischaltung der Reihen: je 5 investierte Bücher in den Reihen darunter.
-- Im Supabase-Dashboard: SQL Editor -> New query -> einfügen -> Run
-- =========================================================

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

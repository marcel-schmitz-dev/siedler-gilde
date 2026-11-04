-- =========================================================
-- Gründer von Goldenau: Profile-Tabelle für Supabase
-- Im Supabase-Dashboard: SQL Editor -> New query -> einfügen -> Run
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Eingeloggte Mitglieder dürfen alle Profile sehen (z. B. für eine Mitgliederliste)
create policy "Profile lesen (eingeloggt)"
  on public.profiles for select
  to authenticated
  using (true);

-- Jeder darf nur sein eigenes Profil ändern
create policy "Eigenes Profil ändern"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id);

-- Legt beim Registrieren automatisch ein Profil mit dem Spielernamen an
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ruimte — initieel databaseschema
-- Uitgangspunten:
--   * Elke tabel heeft Row Level Security (RLS). Een gebruiker ziet en wijzigt uitsluitend eigen gegevens.
--   * Abonnementen en limieten zijn alleen door de server (service role / betaalprovider-webhook) te wijzigen.
--   * Opslaan gebruikt een revisienummer zodat een oudere autosave nooit een nieuwere versie overschrijft.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Plannen (gratis / plus / pro). Referentiedata, leesbaar voor iedereen.
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  -- null = onbeperkt
  max_projects integer check (max_projects is null or max_projects >= 0),
  sort_order integer not null default 0
);

-- Supabase geeft standaard ruime rechten; we beginnen bij nul en geven daarna gericht toegang.
revoke all on public.plans from anon, authenticated;

insert into public.plans (id, name, max_projects, sort_order) values
  ('free', 'Gratis', 3, 0),
  ('plus', 'Plus', 25, 1),
  ('pro', 'Pro', null, 2);

alter table public.plans enable row level security;
create policy "plans zijn openbaar leesbaar" on public.plans for select to anon, authenticated using (true);
grant select on public.plans to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profielen: zo min mogelijk persoonsgegevens (geen e-mail dupliceren; dat staat in auth.users).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supabase geeft standaard ruime rechten; we beginnen bij nul en geven daarna gericht toegang.
revoke all on public.profiles from anon, authenticated;

alter table public.profiles enable row level security;
create policy "eigen profiel lezen" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "eigen profiel wijzigen" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Rechten per gebruiker (abonnement). Alleen-lezen voor de gebruiker zelf.
-- Later vult een Stripe-webhook (met service role) deze tabel.
-- ---------------------------------------------------------------------------
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null default 'free' references public.plans (id),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_end timestamptz,
  billing_customer_id text,
  updated_at timestamptz not null default now()
);

-- Supabase geeft standaard ruime rechten; we beginnen bij nul en geven daarna gericht toegang.
revoke all on public.entitlements from anon, authenticated;

alter table public.entitlements enable row level security;
create policy "eigen abonnement lezen" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));
grant select on public.entitlements to authenticated;
-- Bewust GEEN insert/update/delete-rechten voor anon of authenticated.

-- Nieuw account → profiel + gratis plan.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.entitlements (user_id, plan_id) values (new.id, 'free');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Projecten
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  document jsonb not null,
  schema_version integer not null,
  revision integer not null default 1,
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_is_object check (jsonb_typeof(document) = 'object'),
  constraint document_version_matches check ((document ->> 'schemaVersion')::integer = schema_version),
  -- Ruim 5 MB per ontwerp; voorkomt misbruik en onnodig grote verzoeken.
  constraint document_size check (pg_column_size(document) <= 5 * 1024 * 1024)
);

-- Supabase geeft standaard ruime rechten; we beginnen bij nul en geven daarna gericht toegang.
revoke all on public.projects from anon, authenticated;

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;
create policy "eigen projecten lezen" on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "eigen projecten aanmaken" on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "eigen projecten wijzigen" on public.projects for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "eigen projecten verwijderen" on public.projects for delete to authenticated
  using (owner_id = (select auth.uid()));

grant select, delete on public.projects to authenticated;
grant insert (name, document, schema_version) on public.projects to authenticated;
grant update (name, document, schema_version) on public.projects to authenticated;

-- Onveranderlijke velden bewaken, revisie ophogen en tijdstempel bijwerken.
create function public.projects_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  if new.document is distinct from old.document or new.name is distinct from old.name
     or new.schema_version is distinct from old.schema_version then
    new.revision := old.revision + 1;
    new.updated_at := now();
  else
    new.revision := old.revision;
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create trigger projects_before_update before update on public.projects
  for each row execute function public.projects_before_update();

-- Projectlimiet van het plan afdwingen (server-side, niet te omzeilen vanuit de browser).
create function public.projects_enforce_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  new.revision := 1;
  new.created_at := now();
  new.updated_at := now();
  -- Voorkomt dat gelijktijdige verzoeken samen de limiet overschrijden.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select p.max_projects into v_limit
  from public.entitlements e join public.plans p on p.id = e.plan_id
  where e.user_id = new.owner_id and e.status in ('active', 'trialing');

  if not found then
    select max_projects into v_limit from public.plans where id = 'free';
  end if;

  if v_limit is not null then
    select count(*) into v_count from public.projects where owner_id = new.owner_id;
    if v_count >= v_limit then
      raise exception 'project_limit_reached' using errcode = 'P0001', hint = format('limit=%s', v_limit);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.projects_enforce_limit() from public, anon, authenticated;

create trigger projects_enforce_limit before insert on public.projects
  for each row execute function public.projects_enforce_limit();

-- Opslaan met conflictbescherming. Draait met de rechten van de aanroeper, dus RLS blijft gelden.
-- Geeft de nieuwe revisie terug, of een fout 'revision_conflict' / 'project_not_found'.
create function public.save_project_document(p_id uuid, p_expected_revision integer, p_document jsonb)
returns table (revision integer, updated_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_column
begin
  return query
    update public.projects as pr
       set document = p_document,
           schema_version = (p_document ->> 'schemaVersion')::integer
     where pr.id = p_id and pr.revision = p_expected_revision
    returning pr.revision, pr.updated_at;
  if found then
    return;
  end if;
  if exists (select 1 from public.projects where id = p_id) then
    raise exception 'revision_conflict' using errcode = 'P0001';
  end if;
  raise exception 'project_not_found' using errcode = 'P0001';
end;
$$;
revoke all on function public.save_project_document(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_project_document(uuid, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Account verwijderen: verwijdert de gebruiker en (via cascade) profiel, rechten en projecten.
-- ---------------------------------------------------------------------------
create function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

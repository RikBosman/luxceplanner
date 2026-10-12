-- Beveiligingstests voor RLS, projectisolatie, limieten, conflictbescherming en accountverwijdering.
-- Elk blok faalt met een exception als een verwachting niet klopt (ON_ERROR_STOP).
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'anna@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bram@example.com');

-- Helper om als een bepaalde gebruiker te handelen.
create function pg_temp.act_as(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid, true);
  execute 'set local role authenticated';
end; $$;

\echo '1. Nieuwe gebruiker krijgt profiel en gratis plan'
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'profielen ontbreken';
  assert (select count(*) from public.entitlements where plan_id = 'free') = 2, 'gratis plan ontbreekt';
end $$;

\echo '2. Gebruiker maakt eigen project aan; eigenaar wordt server-side bepaald'
begin;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
insert into public.projects (name, document, schema_version) values ('Woonkamer Anna', '{"schemaVersion":1}', 1);
do $$ begin
  assert (select owner_id from public.projects where name = 'Woonkamer Anna') = '11111111-1111-1111-1111-111111111111';
end $$;
commit;

\echo '3. Andere gebruiker kan het project niet zien, wijzigen of verwijderen'
begin;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
do $$
declare v_id uuid;
begin
  assert (select count(*) from public.projects) = 0, 'Bram ziet het project van Anna';
  update public.projects set name = 'gehackt';
  delete from public.projects;
  reset role;
  select id into v_id from public.projects where name = 'Woonkamer Anna';
  assert v_id is not null, 'project van Anna is gewijzigd of verwijderd';
end $$;
commit;

\echo '4. Project op naam van een ander aanmaken wordt geweigerd'
begin;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
do $$ begin
  begin
    insert into public.projects (owner_id, name, document, schema_version)
      values ('11111111-1111-1111-1111-111111111111', 'x', '{"schemaVersion":1}', 1);
    raise exception 'insert namens een ander had geweigerd moeten worden';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '5. Eigenaar kan niet worden overgedragen via een update'
begin;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
do $$ begin
  begin
    update public.projects set owner_id = '22222222-2222-2222-2222-222222222222';
    raise exception 'owner_id had niet wijzigbaar mogen zijn';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '6. Opslaan met revisie: nieuwere versie wordt niet door een oudere overschreven'
begin;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
do $$
declare v_id uuid; v_rev integer;
begin
  select id into v_id from public.projects limit 1;
  select revision into v_rev from public.save_project_document(v_id, 1, '{"schemaVersion":1,"n":2}');
  assert v_rev = 2, format('verwachtte revisie 2, kreeg %s', v_rev);
  begin
    perform public.save_project_document(v_id, 1, '{"schemaVersion":1,"n":"oud"}');
    raise exception 'verouderde save had geweigerd moeten worden';
  exception when raise_exception then
    assert sqlerrm = 'revision_conflict', sqlerrm;
  end;
  assert (select document ->> 'n' from public.projects where id = v_id) = '2', 'nieuwere data overschreven';
end $$;
commit;

\echo '7. Opslaan in het project van een ander geeft "niet gevonden"'
begin;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
do $$
declare v_id uuid;
begin
  reset role;
  select id into v_id from public.projects limit 1;
  perform pg_temp.act_as('22222222-2222-2222-2222-222222222222');
  begin
    perform public.save_project_document(v_id, 2, '{"schemaVersion":1}');
    raise exception 'save in andermans project had moeten falen';
  exception when raise_exception then
    assert sqlerrm = 'project_not_found', sqlerrm;
  end;
end $$;
rollback;

\echo '8. Ongeldige documenten worden door de database geweigerd'
begin;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
do $$ begin
  begin
    insert into public.projects (name, document, schema_version) values ('x', '[1,2,3]', 1);
    raise exception 'array als document had geweigerd moeten worden';
  exception when check_violation then null;
  end;
  begin
    insert into public.projects (name, document, schema_version) values ('   ', '{"schemaVersion":1}', 1);
    raise exception 'lege naam had geweigerd moeten worden';
  exception when check_violation then null;
  end;
end $$;
rollback;

\echo '9. Gratis plan: maximaal 3 projecten'
begin;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
insert into public.projects (name, document, schema_version) values ('2', '{"schemaVersion":1}', 1), ('3', '{"schemaVersion":1}', 1);
do $$ begin
  begin
    insert into public.projects (name, document, schema_version) values ('4', '{"schemaVersion":1}', 1);
    raise exception 'vierde project had geweigerd moeten worden';
  exception when raise_exception then
    assert sqlerrm = 'project_limit_reached', sqlerrm;
  end;
end $$;
rollback;

\echo '10. Gebruiker kan eigen abonnement niet opwaarderen'
begin;
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
do $$ begin
  begin
    update public.entitlements set plan_id = 'pro';
    raise exception 'plan had niet wijzigbaar mogen zijn';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.plans (id, name) values ('gratis_pro', 'x');
    raise exception 'plannen hadden niet wijzigbaar mogen zijn';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

\echo '11. Anonieme bezoeker ziet geen projecten en kan niets aanmaken'
begin;
set local role anon;
do $$ begin
  begin
    perform count(*) from public.projects;
    raise exception 'anon had geen leesrechten mogen hebben';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.plans) = 3, 'anon moet plannen kunnen zien (prijzenpagina)';
end $$;
rollback;

\echo '12. Account verwijderen verwijdert alle eigen gegevens, en alleen die'
begin;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
insert into public.projects (name, document, schema_version) values ('Bram', '{"schemaVersion":1}', 1);
select public.delete_own_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '22222222-2222-2222-2222-222222222222'), 'gebruiker bestaat nog';
  assert not exists (select 1 from public.projects where owner_id = '22222222-2222-2222-2222-222222222222'), 'projecten bestaan nog';
  assert not exists (select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'profiel bestaat nog';
  assert exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111'), 'andere gebruiker is verwijderd';
  assert exists (select 1 from public.projects where owner_id = '11111111-1111-1111-1111-111111111111'), 'andermans projecten verwijderd';
end $$;
commit;

\echo 'Alle databasetests geslaagd.'

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email = lower(email) and length(btrim(email)) > 0),
  full_name text not null check (length(btrim(full_name)) > 0),
  role text not null check (role in ('Driver', 'BackOffice')),
  is_admin boolean not null default false,
  company_id uuid not null references public.companies(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create unique index user_profiles_email_lower_idx on public.user_profiles (lower(email));
create index user_profiles_company_role_idx on public.user_profiles (company_id, role);

create table public.user_identity_mappings (
  user_id uuid primary key,
  company_id uuid not null,
  legacy_driver_user_id text,
  legacy_driver_email text,
  created_at timestamptz not null default now(),
  constraint user_identity_mappings_profile_company_fk
    foreign key (user_id, company_id)
    references public.user_profiles (user_id, company_id)
    on update cascade on delete cascade
);

create unique index user_identity_mappings_legacy_id_idx
  on public.user_identity_mappings (company_id, legacy_driver_user_id)
  where legacy_driver_user_id is not null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete restrict,
  action text not null check (length(btrim(action)) > 0),
  entity_type text not null check (length(btrim(entity_type)) > 0),
  entity_id text,
  "timestamp" timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index audit_logs_company_timestamp_idx
  on public.audit_logs (company_id, "timestamp" desc);
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.company_id
  from public.user_profiles as profile
  join public.companies as company on company.id = profile.company_id
  where profile.user_id = (select auth.uid())
    and profile.is_active = true
    and company.is_active = true
  limit 1
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles as profile
    join public.companies as company on company.id = profile.company_id
    where profile.user_id = (select auth.uid())
      and profile.is_active = true
      and profile.is_admin = true
      and company.is_active = true
  )
$$;

revoke all on function public.current_user_company_id() from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_company_id() to authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

alter table public.companies enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_identity_mappings enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.companies, public.user_profiles, public.user_identity_mappings, public.audit_logs from anon, authenticated;
grant select on table public.companies, public.user_profiles, public.user_identity_mappings, public.audit_logs to authenticated;
grant all on table public.companies, public.user_profiles, public.user_identity_mappings, public.audit_logs to service_role;

create policy companies_select_own_active_company
  on public.companies for select to authenticated
  using (id = (select public.current_user_company_id()));

create policy user_profiles_select_self_or_company_admin
  on public.user_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      (select public.current_user_is_admin())
      and company_id = (select public.current_user_company_id())
    )
  );

create policy user_identity_mappings_select_self_or_company_admin
  on public.user_identity_mappings for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      (select public.current_user_is_admin())
      and company_id = (select public.current_user_company_id())
    )
  );

create policy audit_logs_select_company_admin
  on public.audit_logs for select to authenticated
  using (
    (select public.current_user_is_admin())
    and company_id = (select public.current_user_company_id())
  );

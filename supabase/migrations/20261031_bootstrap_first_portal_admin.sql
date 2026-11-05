create or replace function public.bootstrap_first_admin(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_company_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dailyspark_first_admin_bootstrap', 0)
  );

  if exists (select 1 from public.user_profiles) then
    raise exception using
      errcode = '23505',
      message = 'portal_already_bootstrapped';
  end if;

  if length(btrim(p_email)) = 0
    or length(btrim(p_full_name)) = 0
    or length(btrim(p_company_name)) = 0 then
    raise exception using
      errcode = '22023',
      message = 'bootstrap_fields_required';
  end if;

  insert into public.companies (name)
  values (btrim(p_company_name))
  returning id into v_company_id;

  insert into public.user_profiles (
    user_id,
    email,
    full_name,
    role,
    is_admin,
    company_id
  ) values (
    p_user_id,
    lower(btrim(p_email)),
    btrim(p_full_name),
    'BackOffice',
    true,
    v_company_id
  );

  return v_company_id;
end;
$$;

revoke all on function public.bootstrap_first_admin(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(uuid, text, text, text)
  to service_role;

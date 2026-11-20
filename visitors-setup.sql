-- Run once in Supabase > SQL Editor

create table if not exists visitors(
  id bigint generated always as identity primary key,
  device_id text unique not null,
  email text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visit_count int not null default 0
);
create table if not exists visitor_visits(
  id bigint generated always as identity primary key,
  visitor_id bigint not null references visitors(id) on delete cascade,
  at timestamptz not null default now()
);
alter table visitors enable row level security;
alter table visitor_visits enable row level security;
-- no policies on purpose: everything goes through the functions below

-- called by auth.js (guests and members); the old track_visit stays for the Visits tab
create or replace function track_visitor(p_device text) returns void
language plpgsql security definer set search_path=public as $$
declare v visitors; m text;
begin
  if p_device is null or length(p_device)<8 then return; end if;
  if auth.uid() is not null then select u.email into m from auth.users u where u.id=auth.uid(); end if;
  insert into visitors(device_id,email) values(p_device,m)
    on conflict(device_id) do update set email=coalesce(m,visitors.email)
    returning * into v;
  if v.visit_count=0 or now()-v.last_seen>interval '30 minutes' then
    insert into visitor_visits(visitor_id) values(v.id);
    update visitors set visit_count=visit_count+1 where id=v.id;
  end if;
  update visitors set last_seen=now() where id=v.id;
end $$;
grant execute on function track_visitor(text) to anon, authenticated;

-- admin only (returns nothing for non-admins)
create or replace function visitor_list()
returns table(id bigint,email text,visits int,first_seen timestamptz,last_seen timestamptz,times timestamptz[])
language sql security definer set search_path=public as $$
  select v.id,v.email,v.visit_count,v.first_seen,v.last_seen,
    array(select vv.at from visitor_visits vv where vv.visitor_id=v.id order by vv.at desc limit 8)
  from visitors v where is_admin() order by v.last_seen desc limit 300 $$;

create or replace function visit_peaks(p_tz text default 'UTC')
returns table(kind text,k int,n bigint)
language sql security definer set search_path=public as $$
  select 'hour'::text, extract(hour from vv.at at time zone p_tz)::int, count(*) from visitor_visits vv where is_admin() group by 2
  union all
  select 'dow'::text, extract(dow from vv.at at time zone p_tz)::int, count(*) from visitor_visits vv where is_admin() group by 2 $$;

grant execute on function visitor_list() to authenticated;
grant execute on function visit_peaks(text) to authenticated;

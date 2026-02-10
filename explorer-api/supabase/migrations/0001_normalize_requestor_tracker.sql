-- Normalize requestor tracker storage into relational tables.
create extension if not exists "pgcrypto";

create table if not exists tracker_clients (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at bigint
);

create table if not exists requestors (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references tracker_clients(id) on delete cascade,
  address text not null,
  nickname text not null,
  added_at bigint,
  created_at timestamptz not null default now(),
  unique (client_id, address)
);

create index if not exists requestors_client_id_idx on requestors(client_id);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  requestor_id uuid not null references requestors(id) on delete cascade,
  request_id text not null,
  nickname text not null,
  problematic boolean not null default false,
  note text not null default '',
  added_at bigint,
  status text,
  created_at timestamptz,
  unique (requestor_id, request_id)
);

create index if not exists requests_requestor_id_idx on requests(requestor_id);

do $$
begin
  if to_regclass('public.requestor_tracker') is not null then
    insert into tracker_clients (id, updated_at)
    select
      rt.id,
      nullif(rt.data->>'updatedAt', '')::bigint
    from requestor_tracker rt
    on conflict (id) do update
      set updated_at = excluded.updated_at;

    insert into requestors (client_id, address, nickname, added_at)
    select
      rt.id as client_id,
      req->>'address' as address,
      coalesce(nullif(req->>'nickname', ''), req->>'address') as nickname,
      nullif(req->>'addedAt', '')::bigint as added_at
    from requestor_tracker rt
    join lateral jsonb_array_elements(rt.data->'requestors') as req on true
    on conflict (client_id, address) do update
      set nickname = excluded.nickname,
          added_at = excluded.added_at;

    insert into requests (
      requestor_id,
      request_id,
      nickname,
      problematic,
      note,
      added_at,
      status,
      created_at
    )
    select
      r.id as requestor_id,
      req_item->>'id' as request_id,
      coalesce(nullif(req_item->>'nickname', ''), req_item->>'id') as nickname,
      coalesce((req_item->>'problematic')::boolean, false) as problematic,
      coalesce(req_item->>'note', '') as note,
      nullif(req_item->>'addedAt', '')::bigint as added_at,
      nullif(req_item->>'status', '') as status,
      nullif(req_item->>'createdAt', '')::timestamptz as created_at
    from requestor_tracker rt
    join lateral jsonb_array_elements(rt.data->'requestors') as req on true
    join requestors r on r.client_id = rt.id and r.address = req->>'address'
    join lateral jsonb_array_elements(coalesce(req->'requests', '[]'::jsonb)) as req_item on true
    on conflict (requestor_id, request_id) do update
      set nickname = excluded.nickname,
          problematic = excluded.problematic,
          note = excluded.note,
          added_at = excluded.added_at,
          status = excluded.status,
          created_at = excluded.created_at;
  end if;
end $$;


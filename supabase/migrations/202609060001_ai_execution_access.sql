-- Server-only execution ledger. Never expose prompts, responses or costs through public table access.
create table public.debate_ai_executions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    request_key uuid not null,
    fingerprint text not null,
    operation text not null check (operation in ('match', 'assist')),
    status text not null default 'running' check (status in ('running', 'completed', 'failed')),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '300 seconds',
    finished_at timestamptz,
    response_body text,
    response_type text,
    response_status integer,
    usage jsonb not null default '[]'::jsonb,
    cost_usd numeric,
    unique (user_id, request_key)
);
create index debate_ai_executions_user_day on public.debate_ai_executions(user_id, created_at desc);
alter table public.debate_ai_executions enable row level security;
revoke all on public.debate_ai_executions from anon, authenticated;
grant select, insert, update on public.debate_ai_executions to service_role;

-- A short transaction serializes admission per verified account. No DB lock spans an AI call.
create or replace function public.debate_reserve_execution(
    p_user_id uuid, p_request_key uuid, p_fingerprint text, p_operation text,
    p_daily_match_limit integer, p_daily_assist_limit integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    existing public.debate_ai_executions%rowtype;
    start_of_day timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
    execution_id uuid;
    used_count integer;
    active_count integer;
    quota integer;
begin
    if p_operation not in ('match','assist') or p_daily_match_limit < 1 or p_daily_assist_limit < 1 then
        raise exception 'invalid execution policy';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
    select * into existing from public.debate_ai_executions where user_id=p_user_id and request_key=p_request_key;
    if found then
        if existing.fingerprint <> p_fingerprint then return jsonb_build_object('error','conflict'); end if;
        if existing.status='completed' and existing.response_body is not null then
            return jsonb_build_object('replay',true,'body',existing.response_body,'contentType',existing.response_type,'status',existing.response_status);
        end if;
        -- Expired or failed attempts are not silently re-executed with the same key.
        return jsonb_build_object('error','duplicate');
    end if;
    select count(*) into active_count from public.debate_ai_executions
      where user_id=p_user_id and status='running' and expires_at>now()
      and (p_operation='match' or operation='match');
    if active_count>0 then return jsonb_build_object('error','busy'); end if;
    if p_operation='assist' then
      select count(*) into active_count from public.debate_ai_executions where user_id=p_user_id and status='running' and expires_at>now();
      if active_count>=3 then return jsonb_build_object('error','busy'); end if;
    end if;
    quota := case when p_operation='match' then p_daily_match_limit else p_daily_assist_limit end;
    select count(*) into used_count from public.debate_ai_executions
      where user_id=p_user_id and operation=p_operation and created_at>=start_of_day;
    if used_count>=quota then return jsonb_build_object('error','quota'); end if;
    insert into public.debate_ai_executions(user_id,request_key,fingerprint,operation)
      values(p_user_id,p_request_key,p_fingerprint,p_operation) returning id into execution_id;
    return jsonb_build_object('id',execution_id,'remaining',quota-used_count-1);
end;
$$;
revoke all on function public.debate_reserve_execution(uuid,uuid,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.debate_reserve_execution(uuid,uuid,text,text,integer,integer) to service_role;

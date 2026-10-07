-- FOS APP DATA: poore dashboard (Brief / Ledger / Sources) ka data ek JSON me.
-- Rule: jo cheez measure nahi hoti wo null => UI "not measured" / "n/r" dikhata hai, kabhi 0 nahi.
with
cfg   as (select value::date sd from ticketing_config where key='start_date'),
today as (select (now() at time zone 'Asia/Kolkata')::date d),
-- window = pichhle 5 working days (Mon-Fri) aaj tak. Gap wale din bhi dikhenge (n/r).
win as (
  select d::date as day from generate_series((select d from today) - 13, (select d from today), interval '1 day') d
  where extract(isodow from d) < 6
  order by d desc limit 5
),
-- expected roster (reporting_edge ke unique parents)
exp_tl as (select distinct parent_id emp from reporting_edge where valid_to is null and relation='tl'),
exp_um as (select distinct parent_id emp from reporting_edge where valid_to is null and relation='um'),
-- har din kaun kaun reporter tha (claims ke author se)
rep as (
  select report_date as day, upper(level) lvl, author_person_id emp
  from claim where report_date in (select day from win) and author_person_id is not null
  group by 1,2,3
),
-- utilisation: har insaan ka din ka ek number (avg), taaki RNN+Teams duplicate na gine
util as (
  select report_date as day, coalesce(subject_person_id, author_person_id) emp, avg(value_num) v
  from claim
  where assertion_type='utilization' and value_num is not null and report_date in (select day from win)
  group by 1,2
),
day_stats as (
  select w.day,
    (select count(*) from claim c where c.report_date=w.day) as claims,
    (select count(distinct emp) from rep r where r.day=w.day and r.lvl='TL' and r.emp in (select emp from exp_tl)) as tl_recv,
    (select count(distinct emp) from rep r where r.day=w.day and r.lvl='UM' and r.emp in (select emp from exp_um)) as um_recv,
    (select count(distinct emp) from rep r where r.day=w.day and r.lvl='VA') as va_recv,
    (select round(avg(v)::numeric,1) from util u where u.day=w.day) as util_avg,
    (select count(*) from util u where u.day=w.day and v = 100) as util_100,
    (select count(*) from util u where u.day=w.day and v < 85) as util_below85,
    (select count(*) from util u where u.day=w.day and v < 10) as util_near0,
    (select count(*) from util u where u.day=w.day) as util_people,
    (select count(*) from task_ticket t where t.opened_date=w.day and t.origin='signal') as tickets_opened
  from win w
),
-- accounts at risk: client_health / cancellation-type signals in window
risk as (
  select c.report_date as day, c.account_canonical acct, c.assertion_type, c.status, c.message_id,
         left(trim(regexp_replace(replace(replace(regexp_replace(c.value_text,'<[^>]+>',' ','g'),'&nbsp;',' '),'&amp;','&'),'[[:space:]]+',' ','g')),300) txt
  from claim c
  where c.report_date in (select day from win) and c.account_canonical is not null
    and ( c.assertion_type='client_health'
       or (c.assertion_type='money_signal' and c.status in ('cancellation','non_renewal','payment_issue')) )
),
risk_fte as (   -- FTE naming, sirf jahan account client_master se unique match ho
  select r.acct, max(dh.fte) fte
  from (select distinct acct from risk) r
  join client_master cm on cm.valid_to is null and (lower(trim(cm.client_name))=r.acct or lower(trim(cm.company_name))=r.acct)
  join deal_hierarchy dh on dh.client_id=cm.client_id and dh.valid_to is null
  group by r.acct
),
-- tickets (board scope = start_date ke baad)
t as (
  select tt.*,
    regexp_replace(trim(coalesce(po.real_name, tt.owner_emp_id)),'[[:space:]]+',' ','g') owner_name,
    regexp_replace(trim(coalesce(ps.real_name, tt.subject_emp_id)),'[[:space:]]+',' ','g') subject_name,
    ((select d from today) - tt.opened_date) age,
    (tt.fingerprint like '%#%') as reopened
  from task_ticket tt
  left join lateral (select p.real_name from person_registry p where p.emp_id=tt.owner_emp_id and p.valid_to is null limit 1) po on true
  left join lateral (select p.real_name from person_registry p where p.emp_id=tt.subject_emp_id and p.valid_to is null limit 1) ps on true
  where tt.origin='signal' and tt.opened_date >= (select sd from cfg)
),
t_src as (
  select t.ticket_id, regexp_replace(trim(m.sender_name),'[[:space:]]+',' ','g') as sender_name, m.report_date,
         left(trim(regexp_replace(replace(replace(regexp_replace(m.message_text,'<[^>]+>',' ','g'),'&nbsp;',' '),'&amp;','&'),'[[:space:]]+',' ','g')), 600) as text,
         (select case upper(level) when 'VE' then 'VA' else upper(level) end from person_registry p where p.emp_id=m.author_emp_id and p.valid_to is null limit 1) as role,
         -- the exact line the claim came from (source_span), for the evidence block
         (select left(trim(regexp_replace(replace(replace(regexp_replace(coalesce(c.source_span,c.value_text),'<[^>]+>',' ','g'),'&nbsp;',' '),'&amp;','&'),'[[:space:]]+',' ','g')),400)
            from claim c join assertion_type_map am on am.assertion_type=c.assertion_type
           where c.message_id=t.source_message_id and am.canonical_type=t.canonical_type
             and c.subject_person_id=t.subject_emp_id
             and coalesce(c.account_canonical,'')=coalesce(t.account_canonical,'')
           order by c.claim_id limit 1) as span
  from t left join messages m on m.message_id = t.source_message_id
),
pending as (
  select c.account_canonical acct, c.report_date as day, max(c.value_num) v
  from claim c
  where c.assertion_type='pending_count' and c.account_canonical is not null and c.value_num is not null
    and c.report_date in (select day from win)
  group by 1,2
),
dom as (
  select coalesce(ch.extraction_domain,'unassigned') domain,
         string_agg(distinct coalesce(tm.team_name, ch.channel_name), ', ') channels,
         count(distinct ch.channel_id) n_channels,
         (select count(*) from messages m where m.channel_id = any(array_agg(ch.channel_id)) and m.report_date in (select day from win)) msgs_window,
         (select max(m.report_date) from messages m where m.channel_id = any(array_agg(ch.channel_id))) last_msg
  from channels ch left join teams tm on tm.team_id = ch.team_id where ch.is_reporting
  group by 1
)
select jsonb_build_object(
  'generated_at', now(),
  'today', (select d from today),
  'start_date', (select sd from cfg),
  'window', (select jsonb_agg(day order by day) from win),
  'expected', jsonb_build_object('tl',(select count(*) from exp_tl),'um',(select count(*) from exp_um)),
  'days', (select jsonb_agg(to_jsonb(s) order by s.day) from day_stats s),
  'missing_tl_latest', (
      select coalesce(jsonb_agg(regexp_replace(trim(coalesce(p.real_name, e.emp)),'[[:space:]]+',' ','g') order by p.real_name),'[]'::jsonb)
      from exp_tl e left join person_registry p on p.emp_id=e.emp and p.valid_to is null
      where not exists (select 1 from rep r where r.lvl='TL' and r.emp=e.emp
                          and r.day=(select max(day) from day_stats where claims>0 and day < (select d from today)))),
  'latest_data_day', (select max(day) from day_stats where claims>0 and day < (select d from today)),
  'today_in_progress', (select jsonb_build_object('claims',claims,'va',va_recv,'tl',tl_recv,'um',um_recv) from day_stats where day=(select d from today)),
  'freshness', jsonb_build_object(
      'teams_ingest',(select max(run_at) from ingest_run_log),'rnn_ingest',(select max(run_at) from rnn_ingest_run_log),
      'extraction',(select max(updated_at) from extractions),'latest_claim',(select max(report_date) from claim)),
  'risk', jsonb_build_object(
      'accounts', (select coalesce(jsonb_agg(x order by x->>'last' desc),'[]'::jsonb) from (
          select jsonb_build_object('acct',r.acct,'first',min(r.day),'last',max(r.day),'days',count(distinct r.day),
                   'kinds',string_agg(distinct coalesce(r.status,r.assertion_type),', '),
                   'fte',(select fte from risk_fte f where f.acct=r.acct),
                   'quote',(array_agg(r.txt order by r.day desc))[1]) x
          from risk r group by r.acct) q),
      'by_day', (select jsonb_agg(jsonb_build_object('day',w.day,'n',(select count(distinct acct) from risk r where r.day=w.day)) order by w.day) from win w),
      'fte_named', (select sum(fte) from risk_fte)),
  'tickets', (select coalesce(jsonb_agg(to_jsonb(x) order by x.rank_key desc, x.ticket_id),'[]'::jsonb) from (
      select t.ticket_id, t.canonical_type, t.severity, t.account_canonical, t.subject_name, t.owner_name, t.owner_level,
             t.status, t.verify_status, t.verify_note, t.needs_founder, t.founder_reason, t.opened_date, t.last_seen_date,
             t.closed_date, t.close_reason, t.close_evidence, t.event_count, t.age, t.sla_days, t.reopened, t.agent_case,
             (t.status<>'closed' and t.age > t.sla_days) as past_sla,
             (case when t.needs_founder then 50 else 0 end + case when t.severity='contradiction' then 100 else 0 end
              + least(t.event_count,9)*10 - least(greatest(((select d from today) - t.last_seen_date),0),30)) as rank_key,
             (select to_jsonb(s) - 'ticket_id' from t_src s where s.ticket_id=t.ticket_id) as source,
             (select coalesce(jsonb_agg(jsonb_build_object('ts',to_char(e.created_at at time zone 'Asia/Kolkata','DD Mon HH24:MI'),
                      'event',e.event_type,'actor',e.actor,'detail',e.detail) order by e.created_at),'[]'::jsonb)
                from ticket_event e where e.ticket_id=t.ticket_id) as events
      from t) x),
  'backlog', (select coalesce(jsonb_agg(jsonb_build_object('acct',acct,'v',v) order by acct),'[]'::jsonb) from (
      select p.acct, jsonb_agg(jsonb_build_object('day',w.day,'v',(select v from pending p2 where p2.acct=p.acct and p2.day=w.day)) order by w.day) v
      from (select distinct acct from pending) p cross join win w group by p.acct) b),
  'domains', (select coalesce(jsonb_agg(to_jsonb(d) order by d.msgs_window desc, d.domain),'[]'::jsonb) from dom d),
  'blind_by_day', (select jsonb_agg(jsonb_build_object('day',s.day,'recv',s.tl_recv,'claims',s.claims) order by s.day) from day_stats s),
  -- CLIENTS: one row per ERP company from client_health (state, FTE, owner, last line). Silent != stable.
  'clients', jsonb_build_object(
      'summary', (select coalesce(jsonb_agg(jsonb_build_object('state',state,'n',n,'fte',fte) order by fte desc),'[]'::jsonb) from (
          select case when state='silent' and last_mention is null then 'no_reports' else state end state, count(*) n, round(sum(fte)::numeric,1) fte
          from client_health group by 1) q),
      'rows', (select coalesce(jsonb_agg(to_jsonb(x) order by x.ord, x.fte desc),'[]'::jsonb) from (
          select ch.company_name, ch.teams, ch.fte, ch.state, ch.state_reason, ch.state_type, ch.state_date,
                 case when ch.state in ('at_risk','watch','growing','stable') then ch.state_line end as state_line,
                 ch.last_mention, ch.days_silent, ch.mentions_30d, ch.n_risk_30d, ch.n_watch_30d, ch.n_growing_30d, ch.n_tls,
                 regexp_replace(trim(coalesce(p.real_name, ch.owner_tl_emp)),'[[:space:]]+',' ','g') as owner,
                 case ch.state when 'at_risk' then 1 when 'watch' then 2 when 'growing' then 3 when 'silent' then 4 when 'stable' then 5 else 6 end as ord
          from client_health ch
          left join person_registry p on p.emp_id = ch.owner_tl_emp and p.valid_to is null
          where ch.last_mention is not null) x),
      'no_reports_by_team', (select coalesce(jsonb_agg(to_jsonb(x) order by x.fte desc),'[]'::jsonb) from (
          select coalesce(ch.teams,'(no team)') team, count(*) companies, round(sum(ch.fte)::numeric,1) fte,
                 (array_agg(ch.company_name||' · '||ch.fte||' FTE' order by ch.fte desc))[1:4] biggest
          from client_health ch where ch.last_mention is null group by 1 order by 3 desc limit 25) x),
      'alias', (select jsonb_build_object('needs_confirm',count(*) filter (where status='needs_confirm'),
                  'unmatched_mentions',coalesce(sum(mentions) filter (where status='unmatched'),0),
                  'matched_mentions',coalesce(sum(mentions) filter (where status in ('auto','confirmed')),0)) from client_alias)),
  -- MONEY: FTE is the only pipeline money unit. Reported currency lines are shown, never summed.
  'money', jsonb_build_object(
      'fte_at_risk', (select round(coalesce(sum(fte),0)::numeric,1) from client_health where state='at_risk'),
      'fte_watch',   (select round(coalesce(sum(fte),0)::numeric,1) from client_health where state='watch'),
      'fte_growing', (select round(coalesce(sum(fte),0)::numeric,1) from client_health where state='growing'),
      'fte_total',   (select round(coalesce(sum(fte),0)::numeric,1) from client_health),
      'fte_no_reports', (select round(coalesce(sum(fte),0)::numeric,1) from client_health where last_mention is null),
      'currency_lines', (select coalesce(jsonb_agg(to_jsonb(x) order by x.report_date desc),'[]'::jsonb) from (
          select c.report_date, coalesce(ca.company_name, c.account_canonical) account,
                 left(trim(regexp_replace(replace(replace(regexp_replace(coalesce(c.source_span,c.value_text,''),'<[^>]+>',' ','g'),'&nbsp;',' '),'&amp;','&'),'[[:space:]]+',' ','g')),240) line,
                 regexp_replace(trim(m.sender_name),'[[:space:]]+',' ','g') sender
          from claim c
          left join client_alias ca on ca.alias=c.account_canonical and ca.status in ('auto','confirmed')
          left join messages m on m.message_id=c.message_id
          where c.unit='currency' and c.report_date >= (select d from today) - 30
          limit 10) x))
) as data;

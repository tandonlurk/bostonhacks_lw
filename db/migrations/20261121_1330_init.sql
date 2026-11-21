-- T01 initial schema (owner: A). Shapes: docs/KICKOFF.md section 8, docs/CONTRACTS.md.
-- Game tables (point_events, district lots, hunts, landmarks, perks, tokens) are used by B.

create table if not exists riders (
  id               text primary key default ('rdr_' || replace(gen_random_uuid()::text, '-', '')),
  display_name     text not null,
  home_team_route_id text not null check (home_team_route_id in ('Red','Orange','Blue','Green','Silver')),
  is_simulated     boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists ride_sessions (
  id                text primary key default ('ses_' || replace(gen_random_uuid()::text, '-', '')),
  rider_id          text not null references riders(id) on delete cascade,
  status            text not null check (status in ('searching','on_vehicle','in_tunnel','left','ended')),
  vehicle_id        text,
  route_id          text,           -- MBTA route id, e.g. Green-B
  team_route_id     text,
  direction_id      smallint,
  stops_credited    int not null default 0,
  points_awarded    int not null default 0,
  manual            boolean not null default false,
  state             jsonb not null default '{}'::jsonb,  -- engine state (src/server/rides/engine.ts)
  started_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  ended_at          timestamptz
);
-- one active session per rider
create unique index if not exists ride_sessions_one_active
  on ride_sessions(rider_id) where ended_at is null;

create table if not exists ride_samples (
  id          bigserial primary key,
  session_id  text not null references ride_sessions(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  accuracy    double precision,
  speed       double precision,
  ts          timestamptz not null,
  matched_vehicle_id text,
  distance_m  double precision,
  created_at  timestamptz not null default now()
);
create index if not exists ride_samples_session on ride_samples(session_id, ts);

create table if not exists point_events (
  id            bigserial primary key,
  rider_id      text not null references riders(id) on delete cascade,
  team_route_id text not null,
  type          text not null,
  amount        int not null,
  ref           text not null unique,  -- idempotency key
  created_at    timestamptz not null default now()
);
create index if not exists point_events_rider on point_events(rider_id, created_at);
create index if not exists point_events_team on point_events(team_route_id);

create table if not exists district_lots (
  team_route_id text not null,
  lot_id        text not null,
  tier          smallint not null default 0,
  points        int not null default 0,
  x             int not null,
  y             int not null,
  kind          text not null,
  primary key (team_route_id, lot_id)
);

create table if not exists hunt_completions (
  rider_id   text not null references riders(id) on delete cascade,
  clue_id    text not null,
  created_at timestamptz not null default now(),
  primary key (rider_id, clue_id)
);

create table if not exists landmark_claims (
  rider_id    text not null references riders(id) on delete cascade,
  landmark_id text not null,
  created_at  timestamptz not null default now(),
  primary key (rider_id, landmark_id)
);

create table if not exists perks (
  id                 text primary key,
  title              text not null,
  partner            text not null,
  cost_tokens        int not null,
  quantity_remaining int not null,
  rotates_at         timestamptz not null
);

create table if not exists redemptions (
  id         bigserial primary key,
  rider_id   text not null references riders(id) on delete cascade,
  perk_id    text not null references perks(id),
  code       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists token_ledger (
  id           bigserial primary key,
  rider_id     text not null references riders(id) on delete cascade,
  delta        int not null,
  reason       text not null,
  ref          text unique,
  tx_signature text,
  created_at   timestamptz not null default now()
);
create index if not exists token_ledger_rider on token_ledger(rider_id, created_at);

-- Delay demo switch, persisted so it works across serverless instances.
create table if not exists delay_overrides (
  team_route_id text primary key,
  active        boolean not null,
  message       text,
  started_at    timestamptz not null default now()
);

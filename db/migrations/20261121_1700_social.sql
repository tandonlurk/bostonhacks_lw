-- #96 social ride loop (owner: A): rider interests, hotspots, hotspot meets, delay photo challenges.
alter table riders add column if not exists interests text[] not null default '{}';
alter table riders add column if not exists avatar_data_url text;

-- crew lookup: active sessions bound to a vehicle
create index if not exists ride_sessions_active_vehicle
  on ride_sessions(vehicle_id) where ended_at is null;

create table if not exists hotspots (
  id              text primary key,
  rider_id        text not null references riders(id) on delete cascade,
  station_id      text not null,
  from_station_id text not null,
  to_station_id   text not null,
  data            jsonb not null,            -- full Hotspot payload (src/contracts Hotspot)
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null
);
create index if not exists hotspots_rider on hotspots(rider_id, expires_at);
create index if not exists hotspots_station on hotspots(station_id, expires_at);

-- pending bumps and completed meets
create table if not exists hotspot_meets (
  id          bigserial primary key,
  rider_id    text not null references riders(id) on delete cascade,
  hotspot_id  text not null,
  station_id  text not null,
  code        text not null,
  lat         double precision not null,
  lng         double precision not null,
  partner_id  text,
  points      int not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  matched_at  timestamptz
);
create index if not exists hotspot_meets_station on hotspot_meets(station_id, expires_at);
create index if not exists hotspot_meets_code on hotspot_meets(code, expires_at);

create table if not exists challenge_submissions (
  rider_id     text not null references riders(id) on delete cascade,
  round_id     text not null,
  challenge_id text not null,
  passed       boolean not null,
  score        double precision,
  points       int not null default 0,
  created_at   timestamptz not null default now(),
  primary key (rider_id, round_id, challenge_id)
);

-- T18: vehicle position history for the delay heatmap. Hypertable when TimescaleDB (Tiger Data) exists.
create table if not exists vehicle_positions (
  ts            timestamptz not null,
  vehicle_id    text not null,
  route_id      text not null,
  team_route_id text not null,
  direction_id  smallint not null,
  lat           double precision not null,
  lng           double precision not null,
  speed         double precision,
  status        text not null,
  stop_id       text
);
create index if not exists vehicle_positions_vehicle_ts on vehicle_positions (vehicle_id, ts);
create index if not exists vehicle_positions_ts on vehicle_positions (ts desc);

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'timescaledb') then
    create extension if not exists timescaledb;
    perform create_hypertable('vehicle_positions', 'ts', if_not_exists => true, migrate_data => true);
  end if;
end $$;

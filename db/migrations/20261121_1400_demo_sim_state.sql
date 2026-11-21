-- Simulator control row for B's demo mode (T08, request #40). Single row id = 'main'.
create table if not exists demo_sim_state (
  id             text primary key,
  running        boolean not null default false,
  run_id         text not null,
  started_at     timestamptz not null,
  processed_tick int not null default -1
);

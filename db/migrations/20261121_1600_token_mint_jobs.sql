-- T16 (B, request #67): devnet mint outbox. Signed tx bytes are stored before sending so a retry
-- resends the same signature and can never mint twice. Public data only (no secrets).
create table if not exists token_mint_jobs (
  ref                     text primary key references token_ledger(ref) on delete cascade,
  tx_signature            text not null,
  signed_transaction      text not null,
  last_valid_block_height bigint not null,
  confirmed               boolean not null default false,
  created_at              timestamptz not null default now()
);
create index if not exists token_mint_jobs_pending on token_mint_jobs (created_at) where not confirmed;

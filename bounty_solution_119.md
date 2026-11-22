2. Code Patch / Fix
Create a new migration file `migrations/0003_add_bounty_and_trivia_tables.sql` (or the next appropriate number based on existing migrations) with the following content:

```sql
-- +migrate Up

CREATE TABLE IF NOT EXISTS bounty_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('bounty', 'trade', 'offer')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reward_tokens INTEGER NOT NULL CHECK (reward_tokens >= 0),
    have TEXT,
    want TEXT,
    station TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reserved', 'completed', 'cancelled')),
    claimant_id TEXT REFERENCES riders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(author_id, request_id)
);

CREATE TABLE IF NOT EXISTS trivia_rounds (
    id TEXT PRIMARY KEY,
    rider_id TEXT NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    stop_id TEXT NOT NULL,
    question_ids JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    answers JSONB,
    correct INTEGER,
    points_awarded INTEGER,
    tokens_awarded INTEGER
);

-- +migrate Down

DROP TABLE IF EXISTS trivia_rounds;
DROP TABLE IF EXISTS bounty_posts;
```
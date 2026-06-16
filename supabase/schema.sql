-- In The Dock — Supabase schema
-- Run this in your Supabase SQL editor after creating the project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- challenges
-- Question bank. Seeded from src/lib/challenges.ts static list.
create table if not exists challenges (
  id          text primary key,
  category    text not null check (category in ('PATTERN','MATRIX','SYMBOL','SPATIAL','SEQUENCE')),
  difficulty  text not null check (difficulty in ('EASY','MEDIUM','HARD','EXPERT')),
  prompt      text not null,
  options     text[] not null,
  answer      text not null,
  explanation text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists challenges_active_idx on challenges (active, difficulty);

-- ---------------------------------------------------------------------- runs
-- One row per game session. Server timestamps for fair tiebreak.
create table if not exists runs (
  id              uuid primary key default gen_random_uuid(),
  game_id         smallint not null default 1,
  day_utc         date not null,
  player          text not null,                  -- lower-case 0x address
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  score           integer not null default 0,
  correct_count   integer not null default 0,
  total_questions integer not null default 0,
  was_free        boolean not null default false,
  paid_tx_hash    text,
  status          text not null default 'open' check (status in ('open','finished','abandoned'))
);

create index if not exists runs_day_score_idx on runs (game_id, day_utc, score desc, ended_at asc);
create index if not exists runs_player_idx    on runs (player, day_utc);
create index if not exists runs_tx_idx        on runs (paid_tx_hash) where paid_tx_hash is not null;

-- ------------------------------------------------------------- run_challenges
-- One row per question shown, with timing for anti-cheat.
create table if not exists run_challenges (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references runs(id) on delete cascade,
  challenge_id   text not null references challenges(id),
  q_index        smallint not null,
  served_at      timestamptz not null default now(),
  answered_at    timestamptz,
  answer_correct boolean,
  answer_choice  text,
  time_ms        integer
);

create index if not exists run_challenges_run_idx on run_challenges (run_id, q_index);

-- -------------------------------------------------------------------- pots
-- Mirror of on-chain pot state for fast reads.
create table if not exists pots (
  game_id      smallint not null default 1,
  day_utc      date not null,
  day_number   integer not null,
  amount_units numeric(38,0) not null default 0,
  player_count integer not null default 0,
  winner       text,
  winner_score integer,
  rolled_tx    text,
  closed       boolean not null default false,
  primary key (game_id, day_utc)
);

create index if not exists pots_game_day_idx on pots (game_id, day_utc desc);

-- --------------------------------------------------------------------- wins
create table if not exists wins (
  game_id      smallint not null default 1,
  day_utc      date not null,
  player       text not null,
  amount_units numeric(38,0) not null,
  score        integer not null,
  claimed      boolean not null default false,
  claim_tx     text,
  primary key (game_id, day_utc, player)
);

create index if not exists wins_player_idx on wins (player, claimed);

-- ---------------------------------------------------------------- bot_wallets
create table if not exists bot_wallets (
  player     text primary key,
  flagged_at timestamptz not null default now(),
  reason     text not null check (reason in ('manual','heuristic')),
  notes      text
);

-- ================================================================ SEED DATA
-- Insert all challenges from src/lib/challenges.ts

insert into challenges (id, category, difficulty, prompt, options, answer, explanation) values
  -- PATTERN
  ('p1','PATTERN','EASY',   E'What comes next?\n\n2,  4,  6,  8,  ?',           array['9','10','12','14'],        '10',  'Add 2 each step: even numbers sequence.'),
  ('p2','PATTERN','EASY',   E'What comes next?\n\n5,  10,  15,  20,  ?',         array['22','24','25','30'],       '25',  'Multiply by 5: counting in fives.'),
  ('p3','PATTERN','MEDIUM', E'What comes next?\n\n1,  1,  2,  3,  5,  8,  ?',   array['10','11','13','12'],       '13',  'Fibonacci: each number = sum of previous two (5+8=13).'),
  ('p4','PATTERN','MEDIUM', E'What comes next?\n\n2,  6,  18,  54,  ?',          array['108','162','216','270'],   '162', 'Multiply by 3 each step (54×3=162).'),
  ('p5','PATTERN','HARD',   E'What comes next?\n\n3,  6,  12,  24,  48,  ?',    array['72','84','96','100'],      '96',  'Double each step (48×2=96).'),
  ('p6','PATTERN','HARD',   E'What comes next?\n\n1,  4,  9,  16,  25,  ?',     array['30','32','36','42'],       '36',  'Perfect squares: 1², 2², 3², 4², 5², 6²=36.'),
  ('p7','PATTERN','EXPERT', E'What comes next?\n\n2,  3,  5,  7,  11,  13,  ?', array['14','15','17','19'],       '17',  'Prime numbers: 17 is the next prime after 13.'),
  ('p8','PATTERN','EXPERT', E'What comes next?\n\n1,  2,  6,  24,  120,  ?',    array['480','600','720','840'],   '720', 'Factorials: 1!, 2!, 3!, 4!, 5!, 6!=720.'),
  -- MATRIX
  ('m1','MATRIX','EASY',   E'Complete the analogy:\n\nBig is to Small\nas\nFast is to ?',    array['Quick','Slow','Speed','Run'],         'Slow',    'Antonym: Big↔Small, Fast↔Slow.'),
  ('m2','MATRIX','EASY',   E'Complete the analogy:\n\nDoctor is to Hospital\nas\nTeacher is to ?', array['Lesson','Book','School','Student'], 'School', 'A doctor works in a hospital; a teacher works in a school.'),
  ('m3','MATRIX','MEDIUM', E'Complete the analogy:\n\nFish is to Water\nas\nBird is to ?',   array['Wing','Egg','Sky','Nest'],            'Sky',     'Fish live in water; birds live in the sky.'),
  ('m4','MATRIX','MEDIUM', E'Complete the analogy:\n\nHand is to Glove\nas\nFoot is to ?',   array['Walk','Sock','Floor','Ankle'],         'Sock',    'A glove covers a hand; a sock covers a foot.'),
  ('m5','MATRIX','HARD',   E'Complete the analogy:\n\nChapter is to Book\nas\nScene is to ?', array['Actor','Camera','Play','Stage'],       'Play',    'A chapter is a part of a book; a scene is a part of a play.'),
  ('m6','MATRIX','EXPERT', E'Complete the analogy:\n\nGenetics is to Biology\nas\nSyntax is to ?', array['Grammar','Language','Writing','Letter'], 'Language', 'Genetics is the study of biology''s code; syntax is the code of language.'),
  -- SYMBOL
  ('s1','SYMBOL','EASY',   E'What comes next?\n\n▲  ■  ▲  ■  ▲  ?',       array['▲','■','●','◆'],             '■',   'Alternating triangle/square pattern.'),
  ('s2','SYMBOL','EASY',   E'What comes next?\n\n●  ○  ●  ○  ●  ?',       array['●','○','■','▲'],             '○',   'Alternating filled/empty circles.'),
  ('s3','SYMBOL','MEDIUM', E'If ★ = 3 and ▲ = 5\n\nWhat is ★ + ▲ + ★?', array['8','9','11','13'],           '11',  '3 + 5 + 3 = 11.'),
  ('s4','SYMBOL','MEDIUM', E'What comes next?\n\n■■  ●  ■■  ●  ■■  ?',   array['■■','●','■','●●'],           '●',   'Pattern: two squares, then one circle, repeating.'),
  ('s5','SYMBOL','HARD',   E'What comes next?\n\n▲  ▲▲  ▲▲▲  ▲▲▲▲  ?', array['▲▲','▲▲▲▲▲','▲▲▲','▲'],     '▲▲▲▲▲','Each step adds one triangle: 1,2,3,4,5.'),
  ('s6','SYMBOL','EXPERT', E'If ◆ = 2, ● = 3, ■ = 5\n\n◆ × ● + ■ = ?', array['10','11','13','16'],         '11',  '(2×3)+5 = 6+5 = 11.'),
  -- SPATIAL
  ('sp1','SPATIAL','EASY',   E'A shape points UP.\nRotated 90° clockwise.\nWhich direction now?',   array['Left','Right','Down','Up'],          'Right', '90° clockwise: Up → Right.'),
  ('sp2','SPATIAL','MEDIUM', E'A clock shows 3:00.\nThe face is rotated 180°.\nWhat time does it show?', array['9:00','6:00','12:00','3:30'],   '9:00',  '180° rotation: the 3 moves to the 9 position.'),
  ('sp3','SPATIAL','HARD',   E'North is to your front.\nYou turn 90° right.\nThen 180° right.\nWhat direction faces you?', array['North','South','East','West'], 'West', 'Start facing North, turn 90° right → East, then 180° right → West.'),
  -- SEQUENCE
  ('sq1','SEQUENCE','EASY',   E'Complete the sequence:\n\nJanuary, March, May, ?',  array['June','July','August','April'],  'July',  'Every other month starting Jan: Jan, Mar, May, Jul.'),
  ('sq2','SEQUENCE','EASY',   E'Complete the sequence:\n\nZ,  Y,  X,  W,  ?',      array['V','U','T','S'],                 'V',     'Reverse alphabet, one letter at a time.'),
  ('sq3','SEQUENCE','MEDIUM', E'Complete the sequence:\n\n10,  9,  7,  4,  0,  ?', array['-3','-4','-5','-6'],            '-5',    'Differences: -1,-2,-3,-4,-5.'),
  ('sq4','SEQUENCE','HARD',   E'Complete the sequence:\n\n31, 28, 31, 30, 31, 30, 31, ?', array['28','30','31','29'],       '31',    'Days per month (Jan-Aug). August has 31 days.'),
  ('sq5','SEQUENCE','EXPERT', E'Complete the sequence:\n\n1, 8, 27, 64, 125, ?',   array['196','200','216','225'],         '216',   'Perfect cubes: 1³, 2³, 3³, 4³, 5³, 6³=216.')
on conflict (id) do nothing;

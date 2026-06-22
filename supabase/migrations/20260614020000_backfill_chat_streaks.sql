-- Migration: Backfill Chat Streaks from historical message data
-- Calculates consecutive daily chat streaks for all user pairs who have exchanged messages.

WITH

-- Step 1: All DM conversation pairs (canonical: user1_id < user2_id)
-- Filter for non-group chats only.
conv_pairs AS (
  SELECT
    cp1.conversation_id,
    LEAST(cp1.user_id, cp2.user_id)    AS user1_id,
    GREATEST(cp1.user_id, cp2.user_id) AS user2_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
    AND cp1.user_id < cp2.user_id
  JOIN public.conversations c
    ON c.id = cp1.conversation_id
  WHERE NOT COALESCE(c.is_group, false)
),

-- Step 2: For each pair+date, did each side send at least one message?
daily_sent AS (
  SELECT
    p.user1_id,
    p.user2_id,
    (m.created_at AT TIME ZONE 'UTC')::date     AS msg_date,
    BOOL_OR(m.sender_id = p.user1_id)           AS u1_sent,
    BOOL_OR(m.sender_id = p.user2_id)           AS u2_sent
  FROM conv_pairs p
  JOIN public.messages m ON m.conversation_id = p.conversation_id
  GROUP BY p.user1_id, p.user2_id, (m.created_at AT TIME ZONE 'UTC')::date
),

-- Step 3: Days where BOTH users sent (mutual days only)
mutual_days AS (
  SELECT user1_id, user2_id, msg_date
  FROM daily_sent
  WHERE u1_sent AND u2_sent
),

-- Step 4: Gap-and-islands — group consecutive mutual days
gap_islands AS (
  SELECT
    user1_id, user2_id, msg_date,
    msg_date - (ROW_NUMBER() OVER (
      PARTITION BY user1_id, user2_id ORDER BY msg_date
    ))::integer AS grp
  FROM mutual_days
),

-- Step 5: Length + date range of each streak island
streak_groups AS (
  SELECT
    user1_id, user2_id,
    COUNT(*)::int AS streak_len,
    MAX(msg_date) AS last_day,
    MIN(msg_date) AS first_day
  FROM gap_islands
  GROUP BY user1_id, user2_id, grp
),

-- Step 6: All-time longest streak per pair
best_streaks AS (
  SELECT
    user1_id, user2_id,
    MAX(streak_len) AS longest_streak
  FROM streak_groups
  GROUP BY user1_id, user2_id
),

-- Step 7: Most recent streak island (current streak candidate)
current_streak AS (
  SELECT DISTINCT ON (user1_id, user2_id)
    user1_id, user2_id, streak_len, last_day
  FROM streak_groups
  ORDER BY user1_id, user2_id, last_day DESC
),

-- Step 8: Last date each individual user sent in this conversation
last_sent_dates AS (
  SELECT
    p.user1_id,
    p.user2_id,
    MAX((m.created_at AT TIME ZONE 'UTC')::date) FILTER (WHERE m.sender_id = p.user1_id) AS user1_last_sent,
    MAX((m.created_at AT TIME ZONE 'UTC')::date) FILTER (WHERE m.sender_id = p.user2_id) AS user2_last_sent
  FROM conv_pairs p
  JOIN public.messages m ON m.conversation_id = p.conversation_id
  GROUP BY p.user1_id, p.user2_id
)

-- Step 9: Upsert into chat_streaks
INSERT INTO public.chat_streaks (
  user1_id, user2_id,
  streak_count, longest_streak,
  user1_sent_date, user2_sent_date,
  last_streak_date, updated_at
)
SELECT
  ls.user1_id,
  ls.user2_id,
  -- Streak is "active" only if the last mutual day was today or yesterday
  CASE
    WHEN cs.last_day >= CURRENT_DATE - 1 THEN COALESCE(cs.streak_len, 0)
    ELSE 0
  END                  AS streak_count,
  COALESCE(bs.longest_streak, 0) AS longest_streak,
  ls.user1_last_sent   AS user1_sent_date,
  ls.user2_last_sent   AS user2_sent_date,
  cs.last_day          AS last_streak_date,
  NOW()                AS updated_at
FROM last_sent_dates ls
LEFT JOIN current_streak cs ON cs.user1_id = ls.user1_id AND cs.user2_id = ls.user2_id
LEFT JOIN best_streaks    bs ON bs.user1_id = ls.user1_id AND bs.user2_id = ls.user2_id

ON CONFLICT (user1_id, user2_id) DO UPDATE SET
  streak_count     = GREATEST(EXCLUDED.streak_count,     chat_streaks.streak_count),
  longest_streak   = GREATEST(EXCLUDED.longest_streak,   chat_streaks.longest_streak),
  user1_sent_date  = GREATEST(EXCLUDED.user1_sent_date,  chat_streaks.user1_sent_date),
  user2_sent_date  = GREATEST(EXCLUDED.user2_sent_date,  chat_streaks.user2_sent_date),
  last_streak_date = GREATEST(EXCLUDED.last_streak_date, chat_streaks.last_streak_date),
  updated_at       = NOW();

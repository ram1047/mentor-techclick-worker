CREATE TABLE IF NOT EXISTS mentors (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  tracks TEXT NOT NULL,
  years INTEGER NOT NULL,
  city TEXT NOT NULL,
  languages TEXT NOT NULL,
  weekly_inr INTEGER NOT NULL,
  monthly_inr INTEGER NOT NULL,
  weekly_includes TEXT NOT NULL,
  monthly_includes TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending',
  verified INTEGER NOT NULL DEFAULT 0,
  is_founding INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seat_requests (
  id TEXT PRIMARY KEY,
  mentor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  goal TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  mentor_share_inr INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  payout_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mentor_applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  tracks TEXT NOT NULL,
  years INTEGER NOT NULL,
  weekly_inr INTEGER NOT NULL,
  monthly_inr INTEGER NOT NULL,
  bio TEXT NOT NULL,
  linkedin TEXT NOT NULL DEFAULT '',
  payout_upi TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  mentor_slug TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_req_email ON seat_requests (email, created_at);
CREATE INDEX IF NOT EXISTS idx_req_mentor ON seat_requests (mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_app_email ON mentor_applications (email, created_at);
CREATE INDEX IF NOT EXISTS idx_mentors_status ON mentors (status);

INSERT OR IGNORE INTO mentors (
  id, slug, name, headline, bio, tracks, years, city, languages,
  weekly_inr, monthly_inr, weekly_includes, monthly_includes,
  seats, status, verified, is_founding, created_at
) VALUES (
  'ram-dixit',
  'ram-dixit',
  'Ram Dixit',
  'L3 trainer for Zscaler, Palo Alto, FortiGate, F5, and Cisco ISE.',
  'Ram Dixit trains working network and security engineers at Techclick. Bring a live problem: a Zscaler policy that is not matching, a Prisma Access tunnel, a FortiGate NAT, an F5 pool, or a Cisco ISE authentication. He sits with you for a week or a month and works the issue with you. This is desk time, separate from a Techclick batch course.',
  '["Zscaler ZIA","Zscaler ZPA","Palo Alto NGFW","Prisma Access","FortiGate","F5 BIG-IP","Cisco ISE","Network troubleshooting"]',
  13,
  'Live online, India',
  'Hindi and English',
  3500,
  12000,
  'One 60-minute working call on the issue you bring, plus written replies for 7 days on that same issue.',
  'Four 60-minute working calls in the month, plus written replies on the issues you bring that month.',
  4,
  'live',
  1,
  1,
  '2026-09-23T00:00:00.000Z'
);

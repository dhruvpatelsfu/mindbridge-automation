// Application database schema. ULID string IDs everywhere; cart keyed by
// the cookie session id. Cart, enrolments, payments are flat for the
// anonymous browsing flow. Auth additions: users table; courses.instructor_id
// (FK, coexists with legacy instructor_name); user_id (FK) on payments and
// enrolments for authenticated checkout. See run-time migrations in
// db/index.ts for legacy on-disk databases — indexes that reference
// optionally-added columns are created there, after the migrations run.
export const tables = `
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  price REAL NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  instructor_name TEXT NOT NULL,
  instructor_id TEXT REFERENCES users(id),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user','admin')),
  is_instructor INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS cart_lines (
  session_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  added_at TEXT NOT NULL,
  PRIMARY KEY (session_id, course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS enrolments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  course_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TEXT NOT NULL,
  date_of_birth TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'mock-paid',
  last4 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id           TEXT PRIMARY KEY REFERENCES users(id),
  date_of_birth     TEXT,
  region            TEXT,
  subscription_tier TEXT CHECK (subscription_tier IS NULL OR subscription_tier IN ('free','pro')),
  updated_at        TEXT NOT NULL
);

-- status is deliberately nullable: D-DB-NULL-STATUS exploits that surface
-- by issuing a targeted UPDATE at boot that nulls the latest paid row for
-- the seeded admin user. Baseline rows are written with status = 'paid'.
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  course_id   TEXT NOT NULL REFERENCES courses(id),
  amount      REAL NOT NULL,
  status      TEXT,
  created_at  TEXT NOT NULL
);
`

// Indexes that reference columns added by run-time migrations live here so
// they can be created AFTER the migrations have ensured the columns exist.
export const indexes = `
CREATE INDEX IF NOT EXISTS idx_courses_featured ON courses(featured);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrolments_user_id ON enrolments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
`

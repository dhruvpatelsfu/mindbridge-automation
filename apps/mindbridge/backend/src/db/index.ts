import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { indexes, tables } from './schema.js'

// Resolution order (first non-empty wins):
//   1. DB_PATH env var (explicit override)
//   2. ':memory:' when NODE_ENV === 'test' so vitest stays hermetic
//   3. file at <cwd>/database/mindbridge.db otherwise (production default)
function resolveDbPath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH
  if (process.env.NODE_ENV === 'test') return ':memory:'
  return resolve(process.cwd(), 'database', 'mindbridge.db')
}

const dbPath = resolveDbPath()

if (dbPath !== ':memory:') {
  mkdirSync(dirname(dbPath), { recursive: true })
}

export const db = new Database(dbPath)

if (dbPath !== ':memory:') {
  db.pragma('journal_mode = WAL')
}

interface PragmaColumn {
  name: string
  type: string
}

// If a legacy DB exists with an older numeric-id schema, drop it so the
// current TEXT (ULID) schema applies. Safe because the seeded data is
// deterministic from faker(42) — nothing user-supplied is destroyed.
const existingCols = db.prepare('PRAGMA table_info(courses)').all() as PragmaColumn[]
const idCol = existingCols.find((c) => c.name === 'id')
if (idCol && idCol.type.toUpperCase().includes('INT')) {
  db.exec('DROP TABLE IF EXISTS courses')
}

// Create tables (no-op when they already exist) before any additive ALTER.
db.exec(tables)

function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaColumn[]
  return rows.some((c) => c.name === column)
}

if (!hasColumn('courses', 'instructor_id')) {
  db.exec('ALTER TABLE courses ADD COLUMN instructor_id TEXT REFERENCES users(id)')
}

if (!hasColumn('courses', 'featured')) {
  db.exec('ALTER TABLE courses ADD COLUMN featured INTEGER NOT NULL DEFAULT 0')
}

if (!hasColumn('courses', 'image')) {
  db.exec("ALTER TABLE courses ADD COLUMN image TEXT NOT NULL DEFAULT ''")
}

if (!hasColumn('payments', 'user_id')) {
  db.exec('ALTER TABLE payments ADD COLUMN user_id TEXT REFERENCES users(id)')
}

if (!hasColumn('enrolments', 'user_id')) {
  db.exec('ALTER TABLE enrolments ADD COLUMN user_id TEXT REFERENCES users(id)')
}

if (!hasColumn('enrolments', 'date_of_birth')) {
  db.exec('ALTER TABLE enrolments ADD COLUMN date_of_birth TEXT')
}

// Indexes referencing potentially-added columns are created last.
db.exec(indexes)

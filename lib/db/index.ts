import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "creative-production.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000"); // build 时多 worker 并发访问时等待而非立即报错

export const db = drizzle(sqlite, { schema });

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_type TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    generate_type TEXT,
    content_goal TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    price TEXT,
    target_audience TEXT,
    product_images TEXT,
    competitor_materials TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    category TEXT,
    price_range TEXT,
    selling_points TEXT,
    restrictions TEXT,
    missing_fields TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    package_index INTEGER NOT NULL,
    content_angle TEXT NOT NULL,
    script TEXT NOT NULL,
    image_brief TEXT,
    storyboard TEXT,
    risk_flags TEXT,
    manual_check_items TEXT,
    recommend_reason TEXT,
    overall_risk_level TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_version_id INTEGER NOT NULL,
    adoption_status TEXT NOT NULL,
    edit_note TEXT,
    rejection_reason TEXT,
    module TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_version_id INTEGER NOT NULL,
    impression INTEGER,
    click INTEGER,
    ctr REAL,
    conversion INTEGER,
    human_review_note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS triggers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_reason TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

// 补充新字段（幂等，已有列时静默跳过）
try { sqlite.exec(`ALTER TABLE content_versions ADD COLUMN overall_risk_level TEXT;`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE tasks ADD COLUMN content_goal TEXT;`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE content_versions ADD COLUMN mind_hook TEXT;`); } catch { /* already exists */ }
try { sqlite.exec(`ALTER TABLE content_versions ADD COLUMN mind_value TEXT;`); } catch { /* already exists */ }

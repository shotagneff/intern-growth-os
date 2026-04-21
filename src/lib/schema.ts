import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// igos_users
// ---------------------------------------------------------------------------
export async function ensureUsersTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS igos_users (
      login_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE igos_users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
  await pool.query(`ALTER TABLE igos_users ADD COLUMN IF NOT EXISTS display_name TEXT;`);
  await pool.query(`ALTER TABLE igos_users ADD COLUMN IF NOT EXISTS role TEXT;`);
  await pool.query(`ALTER TABLE igos_users ADD COLUMN IF NOT EXISTS active BOOLEAN;`);
  await pool.query(`ALTER TABLE igos_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE igos_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`);
}

// ---------------------------------------------------------------------------
// members
// ---------------------------------------------------------------------------
export async function ensureMembersTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT,
      role TEXT,
      icon_url TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS team TEXT;');
  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT;');
  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS icon_url TEXT;');
  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;');
  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();');
}

// ---------------------------------------------------------------------------
// announcements
// ---------------------------------------------------------------------------
export async function ensureAnnouncementsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT,
      cover_image_url TEXT,
      link_url TEXT,
      published_at DATE,
      author_member_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';");
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cover_image_url TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS link_url TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at DATE;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_member_id TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();');
}

// ---------------------------------------------------------------------------
// admin_events
// ---------------------------------------------------------------------------
export async function ensureAdminEventsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_events (
      id TEXT PRIMARY KEY,
      company_name TEXT,
      program_name TEXT,
      date TEXT,
      place TEXT,
      venue TEXT,
      type TEXT,
      industries TEXT,
      concept_summary TEXT,
      company_count INTEGER,
      capacity INTEGER,
      target TEXT,
      reserve_url TEXT,
      time TEXT,
      line_keyword TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS company_name TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS program_name TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS date TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS place TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS venue TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS type TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS industries TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS concept_summary TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS company_count INTEGER;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS capacity INTEGER;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS target TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS reserve_url TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS time TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS line_keyword TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();');
}

// ---------------------------------------------------------------------------
// elearning_videos
// ---------------------------------------------------------------------------
export async function ensureElearningVideosTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS elearning_videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      url TEXT NOT NULL,
      cover_image_url TEXT,
      course TEXT NOT NULL DEFAULT 'onboarding',
      section_id INTEGER,
      episode_label TEXT,
      duration_minutes INTEGER,
      instructor_id TEXT,
      instructor_name TEXT,
      material_label TEXT,
      material_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query('ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS material_label TEXT;');
  await pool.query('ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS material_url TEXT;');
  await pool.query('ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS instructor_id TEXT;');
  await pool.query('ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS section_id INTEGER;');
  await pool.query("ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS course TEXT NOT NULL DEFAULT 'onboarding';");
}

// ---------------------------------------------------------------------------
// elearning_progress
// ---------------------------------------------------------------------------
export async function ensureElearningProgressTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS elearning_progress (
      login_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      watched BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (login_id, video_id)
    );
  `);

  await pool.query("ALTER TABLE elearning_progress ADD COLUMN IF NOT EXISTS watched BOOLEAN NOT NULL DEFAULT FALSE;");
  await pool.query("ALTER TABLE elearning_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();");
}

// ---------------------------------------------------------------------------
// documents
// ---------------------------------------------------------------------------
export async function ensureDocumentsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      note TEXT,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ---------------------------------------------------------------------------
// 全テーブル一括作成
// ---------------------------------------------------------------------------
export async function ensureAllTables(): Promise<void> {
  await ensureUsersTable();
  await ensureMembersTable();
  await ensureAnnouncementsTable();
  await ensureAdminEventsTable();
  await ensureElearningVideosTable();
  await ensureElearningProgressTable();
  await ensureDocumentsTable();
}

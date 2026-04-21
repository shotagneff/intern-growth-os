import { Pool } from "pg";

// グローバルスコープでPoolインスタンスを1つだけ保持
// Next.jsの開発モードではHMRで再読み込みされるため、globalThisに保持して重複を防ぐ
const globalForPg = globalThis as unknown as { _pgPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // DATABASE_URL未設定時は最小限のPoolを返す（クエリ時にエラーになる）
    return new Pool();
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const pool: Pool = globalForPg._pgPool ?? (globalForPg._pgPool = createPool());

/**
 * DATABASE_URLが設定されているかチェック
 */
export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

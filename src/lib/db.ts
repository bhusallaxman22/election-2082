/**
 * MariaDB connection pool (singleton).
 * Uses mysql2/promise for async/await support.
 */
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "192.168.0.142",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "election_2082",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // MariaDB-friendly settings
      charset: "utf8mb4",
      timezone: "+05:45", // Nepal Time
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

/**
 * Execute a query and return rows.
 */
export async function query<T = unknown>(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows as T[];
}

/**
 * Execute a statement (INSERT/UPDATE/DELETE) and return result metadata.
 */
export async function execute(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<mysql.ResultSetHeader> {
  const p = getPool();
  const [result] = await p.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

/**
 * Get a single connection for transactions.
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  return getPool().getConnection();
}

/**
 * Database schema migration — auto-creates tables on first run.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
import mysql from "mysql2/promise";
import { getPool, execute } from "./db";

let migrated = false;

export async function ensureSchema() {
  if (migrated) return;

  // First, ensure the database itself exists
  const tmpConn = await mysql.createConnection({
    host: process.env.DB_HOST || "192.168.0.142",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
  });
  await tmpConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "election_2082"}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await tmpConn.end();

  // ── party_results ──────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS party_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      party_id INT NOT NULL,
      party_name VARCHAR(255) NOT NULL,
      party_nickname VARCHAR(100),
      party_slug VARCHAR(100),
      party_image TEXT,
      party_color VARCHAR(20),
      leading_count INT DEFAULT 0,
      winner_count INT DEFAULT 0,
      total_seat INT DEFAULT 0,
      extra_json JSON,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_party_id (party_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── constituency_results ────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS constituency_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      district_id INT NOT NULL,
      const_number INT NOT NULL,
      district_name VARCHAR(100),
      province_id INT,
      province_name VARCHAR(100),
      constituency_name VARCHAR(150),
      constituency_slug VARCHAR(150),
      leader_name VARCHAR(200),
      leader_party VARCHAR(50),
      leader_party_color VARCHAR(20),
      leader_votes INT DEFAULT 0,
      runner_up_name VARCHAR(200),
      runner_up_votes INT DEFAULT 0,
      margin INT DEFAULT 0,
      total_votes INT DEFAULT 0,
      status ENUM('won','leading','counting','pending') DEFAULT 'pending',
      candidates_json JSON,
      data_hash VARCHAR(64),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_dist_const (district_id, const_number),
      INDEX idx_province (province_id),
      INDEX idx_status (status),
      INDEX idx_leader_party (leader_party)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── sync_log ────────────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS sync_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sync_type ENUM('parties','constituencies','full') NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP NULL,
      rows_changed INT DEFAULT 0,
      status ENUM('running','success','error') DEFAULT 'running',
      error_msg TEXT,
      data_hash VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── election_meta (stores raw election summary / OnlineKhabar response) ──
  await execute(`
    CREATE TABLE IF NOT EXISTS election_meta (
      meta_key VARCHAR(100) PRIMARY KEY,
      meta_value LONGTEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── districts ──────────────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS districts (
      district_id INT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      name_np VARCHAR(200),
      state_id INT NOT NULL,
      constituencies INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_state (state_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── candidate_images ───────────────────────────────────────────────
  await execute(`
    CREATE TABLE IF NOT EXISTS candidate_images (
      candidate_id INT PRIMARY KEY,
      image_data MEDIUMBLOB NOT NULL,
      content_type VARCHAR(50) DEFAULT 'image/jpeg',
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  migrated = true;
  console.log("[migrate] Schema ready");
}

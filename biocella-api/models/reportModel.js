const db = require("../config/mysql");

let reportsTableReady = false;

const ensureReportsTable = async () => {
  if (reportsTableReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_reports (
      report_id INT AUTO_INCREMENT PRIMARY KEY,
      report_uuid VARCHAR(36) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      period ENUM('weekly', 'monthly') NOT NULL,
      range_start DATE NOT NULL,
      range_end DATE NOT NULL,
      range_label VARCHAR(120) NOT NULL,
      report_payload LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_reports_user_created (user_id, created_at),
      UNIQUE KEY uq_admin_reports_window (user_id, period, range_start, range_end)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  // Backward-compatibility for deployments where the table already exists with older schema.
  await db.execute(`ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS range_start DATE NULL AFTER period`);
  await db.execute(`ALTER TABLE admin_reports ADD COLUMN IF NOT EXISTS range_end DATE NULL AFTER range_start`);
  await db.execute(`UPDATE admin_reports SET range_start = DATE(created_at) WHERE range_start IS NULL`);
  await db.execute(`UPDATE admin_reports SET range_end = DATE(created_at) WHERE range_end IS NULL`);
  await db.execute(`ALTER TABLE admin_reports MODIFY COLUMN range_start DATE NOT NULL`);
  await db.execute(`ALTER TABLE admin_reports MODIFY COLUMN range_end DATE NOT NULL`);

  const [existingUniqueIndex] = await db.execute(
    `SHOW INDEX FROM admin_reports WHERE Key_name = 'uq_admin_reports_window'`
  );
  if (!existingUniqueIndex.length) {
    await db.execute(
      `ALTER TABLE admin_reports ADD UNIQUE KEY uq_admin_reports_window (user_id, period, range_start, range_end)`
    );
  }

  reportsTableReady = true;
};

exports.getReportsByUserId = async (userId) => {
  await ensureReportsTable();

  const [rows] = await db.execute(
    `
      SELECT report_uuid, user_id, period, range_start, range_end, range_label, report_payload, created_at
      FROM admin_reports
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [userId]
  );

  return rows;
};

exports.upsertReport = async ({
  report_uuid,
  user_id,
  period,
  range_start,
  range_end,
  range_label,
  report_payload,
}) => {
  await ensureReportsTable();

  const [result] = await db.execute(
    `
      INSERT INTO admin_reports (report_uuid, user_id, period, range_start, range_end, range_label, report_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        report_uuid = VALUES(report_uuid),
        range_label = VALUES(range_label),
        report_payload = VALUES(report_payload),
        created_at = CURRENT_TIMESTAMP
    `,
    [report_uuid, user_id, period, range_start, range_end, range_label, report_payload]
  );

  return result.affectedRows;
};

exports.getReportByWindow = async ({ user_id, period, range_start, range_end }) => {
  await ensureReportsTable();

  const [rows] = await db.execute(
    `
      SELECT report_uuid, user_id, period, range_start, range_end, range_label, report_payload, created_at
      FROM admin_reports
      WHERE user_id = ? AND period = ? AND range_start = ? AND range_end = ?
      LIMIT 1
    `,
    [user_id, period, range_start, range_end]
  );

  return rows[0] || null;
};

exports.deleteReport = async ({ report_uuid, user_id }) => {
  await ensureReportsTable();

  const [result] = await db.execute(
    `
      DELETE FROM admin_reports
      WHERE report_uuid = ? AND user_id = ?
    `,
    [report_uuid, user_id]
  );

  return result.affectedRows;
};

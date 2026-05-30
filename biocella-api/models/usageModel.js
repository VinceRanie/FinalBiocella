const db = require("../config/mysql.js");

// CREATE
exports.createUsageLog = async (data) => {
  const { chemical_id, user_id, amount_used, purpose, batch_id } = data;
  console.log('Usage model createUsageLog called with:', { chemical_id, user_id, amount_used, purpose, batch_id });
  
  try {
    const [result] = await db.execute(
      "INSERT INTO chemical_usage_log (chemical_id, user_id, date_used, amount_used, purpose, batch_id) VALUES (?, ?, NOW(), ?, ?, ?)",
      [chemical_id, user_id, amount_used, purpose, batch_id]
    );
    console.log('Usage log created with ID:', result.insertId);
    return result.insertId;
  } catch (err) {
    console.error('Usage model insert SQL error:', err.message, err.code, err.sqlState);
    throw err;
  }
};

// READ ALL
exports.getAllUsageLogs = async () => {
  const [rows] = await db.execute(`
    SELECT l.*, r.name AS chemical_name
    FROM chemical_usage_log l
    JOIN reagents_chemicals r ON l.chemical_id = r.chemical_id
  `);
  return rows;
};

// READ ONE
exports.getUsageLogById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM chemical_usage_log WHERE log_id = ?", [id]);
  return rows[0];
};

// UPDATE
exports.updateUsageLog = async (id, data) => {
  const { chemical_id, user_id, amount_used, purpose, batch_id } = data;
  const [result] = await db.execute(
    "UPDATE chemical_usage_log SET chemical_id=?, user_id=?, amount_used=?, purpose=?, batch_id=? WHERE log_id=?",
    [chemical_id, user_id, amount_used, purpose, batch_id, id]
  );
  return result.affectedRows;
};

// DELETE
exports.deleteUsageLog = async (id) => {
  const [result] = await db.execute("DELETE FROM chemical_usage_log WHERE log_id = ?", [id]);
  return result.affectedRows;
};

// ANALYTICS: Top used chemicals/reagents within a date window
exports.getTopUsedChemicals = async ({ startDate = null, endDate = null, limit = 5 }) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;

  const [rows] = await db.execute(
    `
      SELECT
        l.chemical_id,
        r.name AS chemical_name,
        r.type AS chemical_type,
        r.unit,
        COALESCE(SUM(l.amount_used), 0) AS total_used,
        COUNT(l.log_id) AS usage_logs,
        MAX(l.date_used) AS last_used_at
      FROM chemical_usage_log l
      JOIN reagents_chemicals r ON r.chemical_id = l.chemical_id
      WHERE (? IS NULL OR l.date_used >= ?)
        AND (? IS NULL OR l.date_used <= ?)
      GROUP BY l.chemical_id, r.name, r.type, r.unit
      ORDER BY total_used DESC, usage_logs DESC, r.name ASC
      LIMIT ?
    `,
    [startDate, startDate, endDate, endDate, safeLimit]
  );

  return rows;
};

// ANALYTICS: Base inventory + usage window data used for stockout/reorder forecasting
exports.getForecastBaseData = async ({ usageWindowDays = 30, limit = 8 }) => {
  const safeWindow = Number.isInteger(usageWindowDays) && usageWindowDays > 0 ? usageWindowDays : 30;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 8;
  const params = [safeWindow, safeLimit];

  const primaryQuery = `
    SELECT
      r.chemical_id,
      r.name AS chemical_name,
      r.type AS chemical_type,
      r.unit,
      r.threshold,
      COALESCE(r.lead_time_days, 7) AS lead_time_days,
      COALESCE(r.safety_stock, 0) AS safety_stock,
      COALESCE(stock.current_stock, 0) AS current_stock,
      COALESCE(usage_stats.window_used, 0) AS window_used,
      COALESCE(usage_stats.usage_logs, 0) AS usage_logs,
      usage_stats.last_used_at
    FROM reagents_chemicals r
    LEFT JOIN (
      SELECT
        chemical_id,
        SUM(GREATEST(COALESCE(quantity, 0) - COALESCE(used_quantity, 0), 0)) AS current_stock
      FROM chemical_stock_batch
      WHERE deleted_at IS NULL
      GROUP BY chemical_id
    ) stock ON stock.chemical_id = r.chemical_id
    LEFT JOIN (
      SELECT
        chemical_id,
        SUM(amount_used) AS window_used,
        COUNT(log_id) AS usage_logs,
        MAX(date_used) AS last_used_at
      FROM chemical_usage_log
      WHERE date_used >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY chemical_id
    ) usage_stats ON usage_stats.chemical_id = r.chemical_id
    WHERE stock.current_stock IS NOT NULL OR usage_stats.window_used IS NOT NULL
    ORDER BY COALESCE(usage_stats.window_used, 0) DESC, r.name ASC
    LIMIT ?
  `;

  try {
    const [rows] = await db.execute(primaryQuery, params);
    return rows;
  } catch (err) {
    // Fallback for older deployments missing lead_time_days/safety_stock/deleted_at
    if (!["ER_BAD_FIELD_ERROR", "ER_PARSE_ERROR"].includes(err.code)) {
      throw err;
    }

    const fallbackQuery = `
      SELECT
        r.chemical_id,
        r.name AS chemical_name,
        r.type AS chemical_type,
        r.unit,
        r.threshold,
        7 AS lead_time_days,
        0 AS safety_stock,
        COALESCE(stock.current_stock, 0) AS current_stock,
        COALESCE(usage_stats.window_used, 0) AS window_used,
        COALESCE(usage_stats.usage_logs, 0) AS usage_logs,
        usage_stats.last_used_at
      FROM reagents_chemicals r
      LEFT JOIN (
        SELECT
          chemical_id,
          SUM(GREATEST(COALESCE(quantity, 0) - COALESCE(used_quantity, 0), 0)) AS current_stock
        FROM chemical_stock_batch
        GROUP BY chemical_id
      ) stock ON stock.chemical_id = r.chemical_id
      LEFT JOIN (
        SELECT
          chemical_id,
          SUM(amount_used) AS window_used,
          COUNT(log_id) AS usage_logs,
          MAX(date_used) AS last_used_at
        FROM chemical_usage_log
        WHERE date_used >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY chemical_id
      ) usage_stats ON usage_stats.chemical_id = r.chemical_id
      WHERE stock.current_stock IS NOT NULL OR usage_stats.window_used IS NOT NULL
      ORDER BY COALESCE(usage_stats.window_used, 0) DESC, r.name ASC
      LIMIT ?
    `;

    const [rows] = await db.execute(fallbackQuery, params);
    return rows;
  }
};

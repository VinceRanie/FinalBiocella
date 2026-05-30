const Usage = require("../models/usageModel");
const db = require("../config/mysql");

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const getPeriodWindow = (period) => {
  const normalized = String(period || "").toLowerCase();
  if (normalized === "weekly") {
    return { period: "weekly", days: 7 };
  }
  return { period: "monthly", days: 30 };
};

const toDateBoundary = (value, boundary) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === "start") {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

// CREATE
exports.create = async (req, res) => {
  try {
    console.log('Usage log request received:', req.body);
    
    const { chemical_id, user_id, amount_used, purpose, batch_id } = req.body;
    
    // Validate required fields
    if (!chemical_id || !user_id || !amount_used || !purpose || !batch_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: chemical_id, user_id, amount_used, purpose, batch_id' 
      });
    }
    
    // Validate that the user exists before creating usage log
    const [userRows] = await db.execute('SELECT user_id FROM user WHERE user_id = ?', [user_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ 
        error: `User with ID ${user_id} not found in the system`,
        details: 'Foreign key constraint: user_id must exist in user table'
      });
    }
    
    // Validate that the chemical exists
    const [chemicalRows] = await db.execute('SELECT chemical_id FROM reagents_chemicals WHERE chemical_id = ?', [chemical_id]);
    if (chemicalRows.length === 0) {
      return res.status(404).json({ 
        error: `Chemical with ID ${chemical_id} not found` 
      });
    }
    
    // Validate that the batch exists and belongs to the same chemical.
    const [batchRows] = await db.execute(
      'SELECT batch_id, chemical_id, deleted_at FROM chemical_stock_batch WHERE batch_id = ?',
      [batch_id]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ 
        error: `Batch with ID ${batch_id} not found` 
      });
    }

    if (Number(batchRows[0].chemical_id) !== Number(chemical_id)) {
      return res.status(400).json({
        error: `Batch ${batch_id} does not belong to chemical ${chemical_id}`,
      });
    }

    if (batchRows[0].deleted_at) {
      return res.status(400).json({
        error: `Batch ${batch_id} is fully consumed and can no longer be used`,
      });
    }
    
    const id = await Usage.createUsageLog(req.body);
    console.log('Usage log created with ID:', id);
    res.status(201).json({ message: "Usage log created", log_id: id });
  } catch (err) {
    console.error('Error creating usage log:', err);
    
    // Handle foreign key constraint errors
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: 'Foreign key constraint error - one of the referenced IDs (user_id, chemical_id, batch_id) does not exist',
        details: err.sqlMessage
      });
    }
    
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    const logs = await Usage.getAllUsageLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const log = await Usage.getUsageLogById(req.params.id);
    if (!log) return res.status(404).json({ message: "Usage log not found" });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const affected = await Usage.updateUsageLog(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: "Usage log not found" });
    res.json({ message: "Usage log updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const affected = await Usage.deleteUsageLog(req.params.id);
    if (!affected) return res.status(404).json({ message: "Usage log not found" });
    res.json({ message: "Usage log deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ANALYTICS: Most used reagents/chemicals ranking
exports.getTopChemicals = async (req, res) => {
  try {
    const { period, start_date, end_date } = req.query;
    const limit = toPositiveInt(req.query.limit, 5);
    const { period: resolvedPeriod, days } = getPeriodWindow(period);

    const endDate = toDateBoundary(end_date, "end") || new Date();
    const startDate =
      toDateBoundary(start_date, "start") ||
      new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const items = await Usage.getTopUsedChemicals({
      startDate,
      endDate,
      limit,
    });

    const normalizedItems = items.map((item, index) => ({
      rank: index + 1,
      chemical_id: Number(item.chemical_id),
      chemical_name: item.chemical_name,
      chemical_type: item.chemical_type,
      unit: item.unit,
      total_used: Number(item.total_used || 0),
      usage_logs: Number(item.usage_logs || 0),
      last_used_at: item.last_used_at,
    }));

    return res.json({
      period: resolvedPeriod,
      range_start: startDate.toISOString(),
      range_end: endDate.toISOString(),
      total_items: normalizedItems.length,
      items: normalizedItems,
    });
  } catch (err) {
    console.error("Error fetching top used chemicals:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch top used chemicals" });
  }
};

// ANALYTICS: Inventory forecasting v1 (moving-average demand + reorder suggestions)
exports.getForecast = async (req, res) => {
  try {
    const { period } = req.query;
    const limit = toPositiveInt(req.query.limit, 8);
    const { period: resolvedPeriod, days } = getPeriodWindow(period);

    const usageWindowDays = toPositiveInt(req.query.window_days, days);
    const forecastDays = toPositiveInt(req.query.forecast_days, days);

    const rows = await Usage.getForecastBaseData({ usageWindowDays, limit });

    const items = rows.map((row) => {
      const currentStock = Number(row.current_stock || 0);
      const windowUsed = Number(row.window_used || 0);
      const leadTimeDays = Number(row.lead_time_days || 7);
      const safetyStock = Number(row.safety_stock || 0);

      const avgDailyUsage = usageWindowDays > 0 ? windowUsed / usageWindowDays : 0;
      const forecastUsage = avgDailyUsage * forecastDays;
      const daysToStockout = avgDailyUsage > 0 ? currentStock / avgDailyUsage : null;
      const reorderPoint = avgDailyUsage * leadTimeDays + safetyStock;
      const recommendedReorderQty = Math.max(0, reorderPoint + forecastUsage - currentStock);

      let riskLevel = "stable";
      if (avgDailyUsage > 0) {
        if ((daysToStockout || 0) <= leadTimeDays) {
          riskLevel = "high";
        } else if ((daysToStockout || 0) <= leadTimeDays + 7) {
          riskLevel = "medium";
        } else {
          riskLevel = "low";
        }
      }

      return {
        chemical_id: Number(row.chemical_id),
        chemical_name: row.chemical_name,
        chemical_type: row.chemical_type,
        unit: row.unit,
        threshold: Number(row.threshold || 0),
        lead_time_days: leadTimeDays,
        safety_stock: safetyStock,
        current_stock: currentStock,
        usage_window_days: usageWindowDays,
        usage_window_total: windowUsed,
        avg_daily_usage: Number(avgDailyUsage.toFixed(4)),
        forecast_days: forecastDays,
        forecast_usage: Number(forecastUsage.toFixed(2)),
        days_to_stockout: daysToStockout === null ? null : Number(daysToStockout.toFixed(2)),
        reorder_point: Number(reorderPoint.toFixed(2)),
        recommended_reorder_qty: Number(recommendedReorderQty.toFixed(2)),
        risk_level: riskLevel,
        usage_logs: Number(row.usage_logs || 0),
        last_used_at: row.last_used_at,
      };
    });

    const atRisk = items.filter((item) => item.risk_level === "high" || item.risk_level === "medium");
    const highRisk = items.filter((item) => item.risk_level === "high");
    const predictedUsage = items.reduce((sum, item) => sum + item.forecast_usage, 0);

    return res.json({
      period: resolvedPeriod,
      window_days: usageWindowDays,
      forecast_days: forecastDays,
      generated_at: new Date().toISOString(),
      overview: {
        total_items: items.length,
        at_risk_count: atRisk.length,
        high_risk_count: highRisk.length,
        predicted_usage_total: Number(predictedUsage.toFixed(2)),
      },
      items,
    });
  } catch (err) {
    console.error("Error fetching inventory forecast:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch inventory forecast" });
  }
};

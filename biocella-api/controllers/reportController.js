const Report = require("../models/reportModel");

const toUserId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePayload = (input) => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

exports.getAll = async (req, res) => {
  try {
    const userId = toUserId(req.query.user_id);
    if (!userId) {
      return res.status(400).json({ error: "Valid user_id is required" });
    }

    const rows = await Report.getReportsByUserId(userId);

    const reports = rows
      .map((row) => {
        const payload = parsePayload(row.report_payload);
        if (!payload) return null;

        return {
          ...payload,
          id: row.report_uuid,
          period: row.period,
          rangeLabel: row.range_label,
          createdAt: payload.createdAt || new Date(row.created_at).toISOString(),
        };
      })
      .filter(Boolean);

    return res.json({ reports });
  } catch (err) {
    console.error("[ReportController] getAll error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch reports" });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = toUserId(req.body?.user_id);
    const period = req.body?.period;
    const rangeStart = String(req.body?.range_start || "").trim();
    const rangeEnd = String(req.body?.range_end || "").trim();
    const rangeLabel = String(req.body?.range_label || "").trim();
    const reportPayload = req.body?.report_payload;

    if (!userId) {
      return res.status(400).json({ error: "Valid user_id is required" });
    }

    if (period !== "weekly" && period !== "monthly") {
      return res.status(400).json({ error: "Invalid period" });
    }

    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({ error: "range_start and range_end are required" });
    }

    if (!rangeLabel || !reportPayload || typeof reportPayload !== "object") {
      return res.status(400).json({ error: "range_label and report_payload are required" });
    }

    const reportId =
      typeof reportPayload.id === "string" && reportPayload.id.length > 0
        ? reportPayload.id
        : require("crypto").randomUUID();

    const payloadToSave = {
      ...reportPayload,
      id: reportId,
      period,
      rangeLabel,
    };

    await Report.upsertReport({
      report_uuid: reportId,
      user_id: userId,
      period,
      range_start: rangeStart,
      range_end: rangeEnd,
      range_label: rangeLabel,
      report_payload: JSON.stringify(payloadToSave),
    });

    const saved = await Report.getReportByWindow({
      user_id: userId,
      period,
      range_start: rangeStart,
      range_end: rangeEnd,
    });

    const parsed = saved ? parsePayload(saved.report_payload) : null;

    if (!parsed) {
      return res.status(500).json({ error: "Report saved but failed to load persisted payload" });
    }

    return res.status(200).json({
      report: {
        ...parsed,
        id: saved.report_uuid,
        period: saved.period,
        rangeLabel: saved.range_label,
        createdAt: parsed.createdAt || new Date(saved.created_at).toISOString(),
      },
    });
  } catch (err) {
    console.error("[ReportController] create error:", err);
    return res.status(500).json({ error: err.message || "Failed to save report" });
  }
};

exports.remove = async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = toUserId(req.query.user_id);

    if (!reportId) {
      return res.status(400).json({ error: "Report ID is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "Valid user_id is required" });
    }

    const affected = await Report.deleteReport({ report_uuid: reportId, user_id: userId });
    if (!affected) {
      return res.status(404).json({ error: "Report not found" });
    }

    return res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("[ReportController] remove error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete report" });
  }
};

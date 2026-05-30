const db = require("../config/mysql.js");
const QRCode = require('qrcode');
const crypto = require('crypto');

// CREATE
exports.createAppointment = async (data) => {
  console.log('[DEBUG] createAppointment received data:', JSON.stringify(data, null, 2));
  
  const {
    user_id,
    student_id,
    department,
    purpose,
    date,
    end_time,
    appointment_source = 'internal',
    requester_name = null,
    requester_email = null,
    requester_phone = null,
    requester_ip = null
  } = data;
  const status = 'pending';
  const qr_code = null; // Will be generated upon approval
  
  console.log('[DEBUG] Extracted values:', {
    user_id,
    student_id,
    department,
    purpose,
    date,
    end_time,
    appointment_source,
    requester_email,
    requester_ip
  });
  
  const [result] = await db.execute(
    `INSERT INTO appointment (
      user_id,
      student_id,
      department,
      purpose,
      date,
      end_time,
      status,
      qr_code,
      pending_at,
      appointment_source,
      requester_name,
      requester_email,
      requester_phone,
      requester_ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
    [
      user_id,
      student_id,
      department,
      purpose,
      date,
      end_time,
      status,
      qr_code,
      appointment_source,
      requester_name,
      requester_email,
      requester_phone,
      requester_ip
    ]
  );
  return result.insertId;
};

exports.countRecentOutsiderByEmail = async (email, hours = 24) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM appointment
     WHERE appointment_source = 'outsider'
       AND requester_email = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [email, hours]
  );

  return Number(rows[0]?.total || 0);
};

exports.countRecentOutsiderByIp = async (ip, minutes = 15) => {
  if (!ip) return 0;

  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM appointment
     WHERE appointment_source = 'outsider'
       AND requester_ip = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [ip, minutes]
  );

  return Number(rows[0]?.total || 0);
};

exports.countUpcomingOutsiderByEmail = async (email) => {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM appointment
     WHERE appointment_source = 'outsider'
       AND requester_email = ?
       AND deleted_at IS NULL
       AND status IN ('pending', 'approved', 'ongoing')
       AND date >= NOW()`,
    [email]
  );

  return Number(rows[0]?.total || 0);
};

// CHECK IF DATE IS MARKED UNAVAILABLE
exports.isDateUnavailable = async (date) => {
  const [rows] = await db.execute(
    `SELECT unavailable_id, unavailable_date, reason
     FROM appointment_unavailable_dates
     WHERE DATE(unavailable_date) = DATE(?) AND deleted_at IS NULL
     LIMIT 1`,
    [date]
  );
  return rows[0] || null;
};

const appointmentSelectBase =
  "SELECT a.*, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name, u.role AS user_role, u.department AS user_department " +
  "FROM appointment a LEFT JOIN user u ON a.user_id = u.user_id";

// READ ALL (optionally scoped to a user/student)
exports.getAllAppointments = async ({ user_id = null, student_id = null } = {}) => {
  let query = `${appointmentSelectBase} WHERE (a.deleted_at IS NULL OR a.status = 'no_show')`;
  const params = [];

  if (user_id) {
    query += " AND a.user_id = ?";
    params.push(user_id);
  }

  if (student_id) {
    query += " AND a.student_id = ?";
    params.push(student_id);
  }

  query += " ORDER BY a.date DESC";

  const [rows] = await db.execute(query, params);
  return rows;
};

// READ BY STATUS
exports.getAppointmentsByStatus = async (status) => {
  if (status === 'no_show') {
    const [rows] = await db.execute(
      `${appointmentSelectBase} WHERE a.status = 'no_show' ORDER BY a.date DESC`
    );
    return rows;
  }

  const [rows] = await db.execute(
    `${appointmentSelectBase} WHERE a.status = ? AND a.deleted_at IS NULL ORDER BY a.date DESC`,
    [status]
  );
  return rows;
};

// CHECK FOR SCHEDULE CONFLICTS - checks for overlapping time ranges on the SAME DATE
exports.checkScheduleConflict = async (date, end_time = null, excludeId = null, student_id = null) => {
  // Query for appointments that overlap with the requested time range on the SAME DATE
  // Overlap occurs if: existing_start < requested_end AND existing_end > requested_start
  let query = `SELECT * FROM appointment 
    WHERE status IN ('pending', 'approved', 'ongoing') 
    AND deleted_at IS NULL
    AND DATE(date) = DATE(?)
    AND date < COALESCE(?, DATE_ADD(?, INTERVAL 1 HOUR))
    AND (end_time IS NULL OR end_time > ?)`;
  
  const params = [date, end_time, date, date];
  
  if (student_id) {
    query += " AND student_id = ?";
    params.push(student_id);
  }
  
  if (excludeId) {
    query += " AND appointment_id != ?";
    params.push(excludeId);
  }
  
  const [rows] = await db.execute(query, params);
  return rows.length > 0;
};

// READ ONE By ID
exports.getAppointmentById = async (id) => {
  const [rows] = await db.execute(
    `${appointmentSelectBase} WHERE a.appointment_id = ? AND a.deleted_at IS NULL`,
    [id]
  );
  return rows[0];
};

// READ ONE WITH USER EMAIL
exports.getAppointmentWithUserEmail = async (id) => {
  const [rows] = await db.execute(
    `${appointmentSelectBase} WHERE a.appointment_id = ? AND a.deleted_at IS NULL`,
    [id]
  );
  return rows[0];
};

// UPDATE
exports.updateAppointment = async (id, data) => {
  const { user_id, student_id, department, purpose, date, status, qr_code } = data;
  const [result] = await db.execute(
    "UPDATE appointment SET user_id=?, student_id=?, department=?, purpose=?, date=?, status=?, qr_code=? WHERE appointment_id=?",
    [user_id, student_id, department, purpose, date, status, qr_code, id]
  );
  return result.affectedRows;
};

// UPDATE STATUS
exports.updateAppointmentStatus = async (id, status, remarks = null) => {
  const timestamp_field = `${status}_at`;
  let query = `UPDATE appointment SET status=?, ${timestamp_field}=NOW()`;
  const params = [status];
  
  if (remarks) {
    query += ", admin_remarks=?";
    params.push(remarks);
  }
  
  if (status === 'denied' || status === 'cancelled') {
    query += ", denial_reason=?";
    params.push(remarks);
  }
  
  query += " WHERE appointment_id=?";
  params.push(id);
  
  const [result] = await db.execute(query, params);
  return result.affectedRows;
};

// GENERATE QR CODE
exports.generateQRCode = async (appointmentId) => {
  // Generate unique verification token
  const qrData = crypto.randomBytes(16).toString('hex');
  
  // Create a neutral scan URL so scanner role can be resolved by the frontend.
  const baseUrl = (process.env.FRONTEND_URL || 'https://testbiocella.dcism.org').replace(/\/+$/, '');
  const verificationUrl = `${baseUrl}/scan/appointment?token=${qrData}&id=${appointmentId}`;
  
  // Generate QR code with the URL
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
  
  // Store the token in database
  await db.execute(
    "UPDATE appointment SET qr_code=? WHERE appointment_id=?",
    [qrData, appointmentId]
  );
  
  return { qrData, qrCodeDataUrl, verificationUrl };
};

// VERIFY QR CODE
exports.verifyQRCode = async (qrCode) => {
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE qr_code = ? AND status = 'ongoing' AND deleted_at IS NULL",
    [qrCode]
  );
  return rows[0];
};

// GET APPOINTMENTS FOR DATE RANGE (for calendar view)
exports.getAppointmentsByDateRange = async (startDate, endDate, userId = null) => {
  let query = "SELECT * FROM appointment WHERE date >= ? AND date <= ? AND deleted_at IS NULL AND status IN ('pending', 'approved', 'ongoing')";
  const params = [startDate, endDate];
  
  if (userId) {
    query += " AND user_id = ?";
    params.push(userId);
  }
  
  const [rows] = await db.execute(query, params);
  return rows;
};

// GET APPOINTMENTS FOR SPECIFIC DATE (approved/ongoing only)
exports.getAppointmentsByDate = async (date) => {
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE DATE(date) = DATE(?) AND deleted_at IS NULL AND status IN ('pending', 'approved', 'ongoing')",
    [date]
  );
  return rows;
};

// GET ALL APPOINTMENTS FOR SPECIFIC DATE (any status)
exports.getAppointmentsByDateAllStatuses = async (date) => {
  const [rows] = await db.execute(
    `SELECT a.*, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name, u.role AS user_role, u.department AS user_department
     FROM appointment a
     LEFT JOIN user u ON a.user_id = u.user_id
     WHERE DATE(date) = DATE(?) 
     AND a.deleted_at IS NULL 
     AND a.status IN ('pending', 'approved', 'ongoing')`,
    [date]
  );
  return rows;
};

// SOFT DELETE (Mark as no-show)
exports.softDeleteAppointment = async (id) => {
  const [result] = await db.execute(
    `UPDATE appointment
     SET status = 'no_show', no_show_at = NOW(), deleted_at = NOW()
     WHERE appointment_id = ?
       AND deleted_at IS NULL
       AND status IN ('approved', 'ongoing')`,
    [id]
  );
  return result.affectedRows;
};

// AUTO-EXPIRE ONGOING APPOINTMENTS (cron job)
exports.expireOldAppointments = async () => {
  const [result] = await db.execute(
    `UPDATE appointment
     SET status = 'no_show', no_show_at = NOW(), deleted_at = NOW()
     WHERE status = 'ongoing'
       AND deleted_at IS NULL
       AND COALESCE(end_time, DATE_ADD(date, INTERVAL 1 HOUR)) < NOW()`
  );
  return result.affectedRows;
};

// AUTO-DENY PAST PENDING APPOINTMENTS (cron job)
exports.autoDenyPastPendingAppointments = async () => {
  const denialReason = 'Your appointment schedule has already passed. The requested date and time are no longer available. Please submit a new appointment request for a future date.';

  // First, collect pending appointments that have already elapsed with useful info for notifications
  const [rows] = await db.execute(
    `SELECT a.appointment_id, a.user_id, u.email AS user_email, a.requester_email, a.requester_name, a.student_id, a.date, a.department, a.purpose
     FROM appointment a
     LEFT JOIN user u ON a.user_id = u.user_id
     WHERE a.status = 'pending'
       AND a.deleted_at IS NULL
       AND COALESCE(a.end_time, DATE_ADD(a.date, INTERVAL 1 HOUR)) < NOW()`
  );

  if (!rows || rows.length === 0) return [];

  // Perform the status update
  await db.execute(
    `UPDATE appointment
     SET status = 'denied', denied_at = NOW(), denial_reason = ?
     WHERE status = 'pending'
       AND deleted_at IS NULL
       AND COALESCE(end_time, DATE_ADD(date, INTERVAL 1 HOUR)) < NOW()`,
    [denialReason]
  );

  // Attach the denial reason for convenience to each row
  return rows.map(r => ({ ...r, denial_reason: denialReason }));
};

// MARK DATE AS UNAVAILABLE (upsert by date)
exports.upsertUnavailableDate = async ({ date, reason, created_by_role = null, created_by_user_id = null, is_emergency = false }) => {
  const [result] = await db.execute(
    `INSERT INTO appointment_unavailable_dates
      (unavailable_date, reason, created_by_role, created_by_user_id, is_emergency)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      reason = VALUES(reason),
      created_by_role = VALUES(created_by_role),
      created_by_user_id = VALUES(created_by_user_id),
      is_emergency = VALUES(is_emergency),
      deleted_at = NULL,
      updated_at = NOW()`,
    [date, reason, created_by_role, created_by_user_id, is_emergency ? 1 : 0]
  );
  return result.affectedRows;
};

// LIST UNAVAILABLE DATES
exports.getUnavailableDates = async (startDate = null, endDate = null) => {
  let query = `SELECT unavailable_id,
                      DATE_FORMAT(unavailable_date, '%Y-%m-%d') AS unavailable_date,
                      reason,
                      created_by_role,
                      created_by_user_id,
         is_emergency,
                      created_at,
                      updated_at
               FROM appointment_unavailable_dates
               WHERE deleted_at IS NULL`;
  const params = [];

  if (startDate) {
    query += " AND DATE(unavailable_date) >= DATE(?)";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND DATE(unavailable_date) <= DATE(?)";
    params.push(endDate);
  }

  query += " ORDER BY unavailable_date ASC";

  const [rows] = await db.execute(query, params);
  return rows;
};

// REMOVE UNAVAILABLE DATE
exports.removeUnavailableDate = async (date) => {
  const [result] = await db.execute(
    `UPDATE appointment_unavailable_dates
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE DATE(unavailable_date) = DATE(?) AND deleted_at IS NULL`,
    [date]
  );
  return result.affectedRows;
};

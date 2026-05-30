const db = require("../config/mysql.js");
const bcrypt = require("bcryptjs");

// Allowed roles for manual updates (DB enum uses 'staff' for RA)
const ALLOWED_ROLES = ["student", "faculty", "staff"];
const USC_EMAIL_DOMAIN = "usc.edu.ph";

// CREATE - Register new user
exports.createUser = async (email, resetToken, resetTokenExpires = null, role = "student") => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }

  const [result] = await db.execute(
    "INSERT INTO user (email, reset_token, reset_token_expires, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)",
    [email, resetToken, resetTokenExpires, "", "", role]
  );
  return result.insertId;
};

// CREATE - Admin-invited user (allows non-USC emails and custom role)
exports.createUserByAdmin = async (email, resetToken, role = "student", resetTokenExpires = null) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }

  const [result] = await db.execute(
    "INSERT INTO user (email, reset_token, reset_token_expires, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)",
    [email, resetToken, resetTokenExpires, "", "", role]
  );
  return result.insertId;
};

// READ - Get user by email
exports.getUserByEmail = async (email) => {
  const [rows] = await db.execute(
    "SELECT user_id, email, password, failed_login_attempts, lockout_until, role, reset_token, reset_token_expires, is_setup_complete, deleted_at, last_verified_at FROM user WHERE email = ?",
    [email]
  );
  return rows[0] || null;
};

// READ - Get user by reset token
exports.getUserByResetToken = async (token) => {
  const [rows] = await db.execute(
    "SELECT user_id, email, password, reset_token, reset_token_expires, first_name, last_name, profile_photo, department, course, role, is_setup_complete, deleted_at, last_verified_at FROM user WHERE reset_token = ?",
    [token]
  );
  return rows[0] || null;
};

// READ - Get user auth details by id
exports.getUserAuthById = async (userId) => {
  const [rows] = await db.execute(
    "SELECT user_id, email, password, role, is_setup_complete, reset_token, reset_token_expires, deleted_at, last_verified_at FROM user WHERE user_id = ?",
    [userId]
  );
  return rows[0] || null;
};

// READ - Get user profile by user id
exports.getUserProfileById = async (userId) => {
  const [rows] = await db.execute(
    `SELECT user_id, email, first_name, last_name, profile_photo, department, course, role, is_setup_complete, last_verified_at
     FROM user
     WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
};

// READ - Check if user exists
exports.userExists = async (email) => {
  const [rows] = await db.execute(
    "SELECT user_id FROM user WHERE email = ?",
    [email]
  );
  return rows.length > 0;
};

// READ - Get all non-admin users
exports.getAllNonAdminUsers = async () => {
  const [columnRows] = await db.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'user'
       AND COLUMN_NAME = 'created_at'`
  );

  const hasCreatedAt = Number(columnRows?.[0]?.count || 0) > 0;

  const [deletedAtColumnRows] = await db.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'user'
       AND COLUMN_NAME = 'deleted_at'`
  );

  const hasDeletedAt = Number(deletedAtColumnRows?.[0]?.count || 0) > 0;

  const createdAtSelect = hasCreatedAt
    ? "COALESCE(created_at, NOW()) AS created_at"
    : "NOW() AS created_at";

  const deletedAtSelect = hasDeletedAt
    ? "deleted_at"
    : "NULL AS deleted_at";

  const [rows] = await db.execute(
    `SELECT user_id, email, first_name, last_name, department, course, role, is_setup_complete,
            last_verified_at,
            ${deletedAtSelect},
            ${createdAtSelect}
     FROM user
     WHERE role <> 'admin'`
  );
  return rows;
};

// UTILITY - Semester verification cycle start
exports.getVerificationCycleStart = (referenceDate = new Date()) => {
  const current = new Date(referenceDate);
  const year = current.getFullYear();
  const augustFirst = new Date(year, 7, 1);

  if (current >= augustFirst) {
    return augustFirst;
  }

  return new Date(year, 0, 1);
};

// UTILITY - Determine if a user must re-verify for the current cycle
exports.isSemesterReverificationDue = (user, referenceDate = new Date()) => {
  if (!user) {
    return false;
  }

  // Only students and faculty are required to re-verify each semester
  const REVERIFY_ROLES = ["student", "faculty"];
  if (!REVERIFY_ROLES.includes(String(user.role || "").toLowerCase())) {
    return false;
  }

  // Only registered (setup-complete) users with a USC email are subject to re-verification
  if (!user.is_setup_complete) {
    return false;
  }

  if (!exports.validateEmailDomain(user.email)) {
    return false;
  }

  const lastVerifiedAt = user.last_verified_at ? new Date(user.last_verified_at) : null;
  const cycleStart = exports.getVerificationCycleStart(referenceDate);

  return !lastVerifiedAt || Number.isNaN(lastVerifiedAt.getTime()) || lastVerifiedAt < cycleStart;
};

// UPDATE - Refresh the user's verification timestamp
exports.markUserVerified = async (userId, verifiedAt = new Date()) => {
  await db.execute(
    "UPDATE user SET last_verified_at = ? WHERE user_id = ?",
    [verifiedAt, userId]
  );
};

// UPDATE - Soft deactivate user by removing password
exports.deactivateUser = async (userId) => {
  const [result] = await db.execute(
    `UPDATE user
     SET password = NULL,
         reset_token = NULL,
         reset_token_expires = NULL,
         failed_login_attempts = 0,
         lockout_until = NULL,
         deleted_at = NOW()
     WHERE user_id = ?
       AND role <> 'admin'
       AND is_setup_complete = 1
       AND deleted_at IS NULL
       AND password IS NOT NULL`,
    [userId]
  );

  return result.affectedRows;
};

// UPDATE - Clear soft-delete marker for user reactivation
exports.reactivateUser = async (userId) => {
  const [result] = await db.execute(
    `UPDATE user
     SET deleted_at = NULL
     WHERE user_id = ?
       AND role <> 'admin'`,
    [userId]
  );

  return result.affectedRows;
};

// UPDATE - Reset failed login attempts after successful login
exports.resetFailedLoginAttempts = async (userId) => {
  await db.execute(
    "UPDATE user SET failed_login_attempts = 0, lockout_until = NULL WHERE user_id = ?",
    [userId]
  );
};

// UPDATE - Increment failed login attempts and set lockout
exports.incrementFailedLoginAttempts = async (userId, newAttempts, lockoutTime = null) => {
  await db.execute(
    "UPDATE user SET failed_login_attempts = ?, lockout_until = ? WHERE user_id = ?",
    [newAttempts, lockoutTime, userId]
  );
};

// UPDATE - Set reset token
exports.setResetToken = async (userId, resetToken, resetTokenExpires = null) => {
  await db.execute(
    "UPDATE user SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?",
    [resetToken, resetTokenExpires, userId]
  );
};

// UPDATE - Role change (cannot promote/demote admins)
exports.updateUserRole = async (userId, role) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error("Invalid role");
  }

  const [result] = await db.execute(
    "UPDATE user SET role = ? WHERE user_id = ? AND role <> 'admin'",
    [role, userId]
  );
  return result.affectedRows;
};

// UPDATE - Set password
exports.setPassword = async (userId, hashedPassword, nextResetAllowedAt = null) => {
  await db.execute(
    "UPDATE user SET password = ?, reset_token = NULL, reset_token_expires = ? WHERE user_id = ?",
    [hashedPassword, nextResetAllowedAt, userId]
  );
};

// UPDATE - Finalize user setup
exports.finalizeUserSetup = async (userId, firstName, lastName, profilePhoto, department, course, hashedPassword) => {
  await db.execute(
    `UPDATE user 
     SET first_name = ?, last_name = ?, profile_photo = ?, department = ?, course = ?, password = ?, is_setup_complete = 1, reset_token = NULL, reset_token_expires = NULL, last_verified_at = NOW()
     WHERE user_id = ?`,
    [firstName, lastName, profilePhoto, department, course, hashedPassword, userId]
  );
};

// UPDATE - Authenticated user profile (department/course/photo, and optional password)
exports.updateUserProfile = async ({ userId, department, course, profilePhoto = null, hashedPassword = null, nextResetAllowedAt = null }) => {
  if (hashedPassword) {
    await db.execute(
      `UPDATE user
       SET department = ?, course = ?, profile_photo = ?, password = ?, reset_token_expires = ?
       WHERE user_id = ?`,
      [department, course, profilePhoto, hashedPassword, nextResetAllowedAt, userId]
    );
    return;
  }

  await db.execute(
    `UPDATE user
     SET department = ?, course = ?, profile_photo = ?
     WHERE user_id = ?`,
    [department, course, profilePhoto, userId]
  );
};

// UPDATE - Authenticated user profile photo only
exports.updateUserProfilePhoto = async (userId, profilePhoto = null) => {
  await db.execute(
    "UPDATE user SET profile_photo = ? WHERE user_id = ?",
    [profilePhoto, userId]
  );
};

// UTILITY - Hash password
exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// UTILITY - Compare password
exports.comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// UTILITY - Validate password strength
exports.validatePasswordStrength = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// UTILITY - Validate email domain
exports.validateEmailDomain = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail.endsWith(`@${USC_EMAIL_DOMAIN}`);
};

// UTILITY - Determine role from USC email format
exports.getRoleFromUscEmail = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] || "";

  // Student emails are numeric (e.g., 21104163@usc.edu.ph); all others are faculty.
  return /^\d+$/.test(localPart) ? "student" : "faculty";
};

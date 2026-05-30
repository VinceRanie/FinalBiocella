const authModel = require("../models/authModel");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");
const { sendEmail } = require('../config/email');

// DB enum roles: student, faculty, staff (staff corresponds to RA)
const ALLOWED_ROLES = ["student", "faculty", "staff"];

const normalizeRole = (role) => {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === "ra") return "staff";
  return r;
};

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_SERVER_ERROR: 500,
};

const JWT_SECRET = process.env.JWT_TOKEN;
if (!JWT_SECRET) {
  throw new Error("JWT_TOKEN environment variable is required.");
}

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null);
if (!APP_BASE_URL) {
  throw new Error("NEXT_PUBLIC_APP_BASE_URL is required in production.");
}

const RESET_LINK_TTL_MS = 60 * 60 * 1000; // 1 hour
const RESET_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_STRENGTH_ERROR_MESSAGE = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.";
const ACCOUNT_REGISTERED_MESSAGE = "An account with this email is already registered.";
const ACCOUNT_NOT_REGISTERED_MESSAGE = "No account is registered with this email.";
const REVERIFICATION_REQUIRED_MESSAGE = "Your account needs semester re-verification. Please sign in with Google to continue.";

// Used only for verifyGoogleProfile
const googleOauthClient = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

const getAuthenticatedUserFromRequest = (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const didEmailSend = (result, expectedRecipient = "") => {
  if (!result) return false;
  if (result.error) return false;
  if (!result.messageId) return false;
  if (result.messageId === "SKIPPED_NO_CONFIG") return false;

  // Gmail OAuth2 sometimes doesn't populate accepted/rejected arrays,
  // so treat a valid messageId as success unless explicitly rejected.
  const accepted = Array.isArray(result.accepted)
    ? result.accepted.map((v) => String(v).toLowerCase())
    : [];
  const rejected = Array.isArray(result.rejected) ? result.rejected : [];

  if (rejected.length > 0) return false;

  // If accepted is empty but we have a messageId, assume success
  if (accepted.length === 0 && result.messageId) {
    return true;
  }

  if (expectedRecipient) {
    return accepted.includes(String(expectedRecipient).toLowerCase());
  }

  return true;
};

const formatDuration = (remainingMs) => {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}${hours > 0 ? ` ${hours} hour${hours === 1 ? "" : "s"}` : ""}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}${minutes > 0 ? ` ${minutes} minute${minutes === 1 ? "" : "s"}` : ""}`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
};

const buildPasswordResetStatus = (user) => {
  const expiresAtValue = user?.reset_token_expires ? new Date(user.reset_token_expires) : null;

  if (!expiresAtValue || Number.isNaN(expiresAtValue.getTime())) {
    return {
      isLocked: false,
      cooldownType: null,
      remainingMs: 0,
      expiresAt: null,
      message: null,
    };
  }

  const remainingMs = expiresAtValue.getTime() - Date.now();
  if (remainingMs <= 0) {
    return {
      isLocked: false,
      cooldownType: null,
      remainingMs: 0,
      expiresAt: null,
      message: null,
    };
  }

  const cooldownType = user?.reset_token ? "token" : "cooldown";
  const formattedDuration = formatDuration(remainingMs);

  return {
    isLocked: true,
    cooldownType,
    remainingMs,
    expiresAt: expiresAtValue.toISOString(),
    message:
      cooldownType === "token"
        ? `A password reset link is already active. You can request a new one in ${formattedDuration}.`
        : `You can request another password reset in ${formattedDuration}.`,
  };
};

const sendAuthMessageResponse = (res, message, statusCode = HttpStatus.OK) =>
  res.status(statusCode).json({
    message,
    statusCode: statusCode,
  });

const buildReverificationPayload = (email) => ({
  message: REVERIFICATION_REQUIRED_MESSAGE,
  reverificationRequired: true,
  reverificationUrl: `/reverify?email=${encodeURIComponent(email)}`,
});

const isSemesterReverificationDue = (user, referenceDate = new Date()) =>
  authModel.isSemesterReverificationDue(user, referenceDate);


const sendFinalizeSetupEmail = async (email, resetToken) => {
  let emailResult;
  try {
    emailResult = await sendEmail({
      to: email,
      subject: "Finalize Your BIOCELLA Account Setup",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #113F67;">Welcome to BIOCELLA!</h2>
          <p>Hi there,</p>
          <p>Thank you for registering with your USC email. To complete your account setup, click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_BASE_URL}/signup/finalize?token=${resetToken}" 
               style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Finalize Setup
            </a>
          </div>
          <p>You will be asked to sign in with your Google account (<strong>${email}</strong>) to verify your identity. Your name and profile photo will be fetched automatically.</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not register for this service, please ignore this email.</p>
          <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  if (!didEmailSend(emailResult, email)) {
    return {
      ok: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Registration could not be completed because finalize email was not sent. Please try again later.",
    };
  }

  return {
    ok: true,
    statusCode: HttpStatus.OK,
    message: "Finalize setup email sent successfully.",
  };
};

const sendAdminInviteEmail = async (email, resetToken, normalizedRole) => {
  let emailResult;
  try {
    emailResult = await sendEmail({
      to: email,
      subject: "Set your password to access BIOCELLA",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #113F67;">You're invited to BIOCELLA</h2>
          <p>Hi,</p>
          <p>An administrator created an account for you with the role: <strong>${normalizedRole.toUpperCase()}</strong>.</p>
          <p>Please click the link below to set your password and finish setup:</p>
          <p>
            <a href="${APP_BASE_URL}/signup/finalize?token=${resetToken}" 
               style="display: inline-block; padding: 10px 20px; background-color: #113F67; color: white; text-decoration: none; border-radius: 5px;">
              Complete your account
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">If you did not expect this invitation, please ignore this email.</p>
          <p>Sincerely,<br>BIOCELLA Team</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Admin invite email error:", emailError);
  }

  if (!didEmailSend(emailResult, email)) {
    return {
      ok: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Invitation could not be completed because setup email was not sent. Please try again later.",
    };
  }

  return {
    ok: true,
    statusCode: HttpStatus.CREATED,
    message: "Admin invite email sent successfully.",
  };
};

const sendReactivationEmail = async (email, resetToken) => {
  let emailResult;
  try {
    emailResult = await sendEmail({
      to: email,
      subject: "Your BIOCELLA account has been reactivated",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #113F67;">Account Reactivated</h2>
          <p>Hi,</p>
          <p>Your BIOCELLA account has been reactivated by an administrator.</p>
          <p>Please click the button below to set your new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_BASE_URL}/forgot-password/reset?token=${resetToken}"
               style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Set New Password
            </a>
          </div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not expect this email, please contact an administrator.</p>
          <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Reactivation email error:", emailError);
  }

  if (!didEmailSend(emailResult, email)) {
    return {
      ok: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "Reactivation email could not be sent. Please try again later.",
    };
  }

  return {
    ok: true,
    statusCode: HttpStatus.OK,
    message: "Reactivation email sent successfully.",
  };
};

const issuePasswordResetForUser = async (user) => {
  const passwordResetStatus = buildPasswordResetStatus(user);
  if (passwordResetStatus.isLocked) {
    return {
      ok: false,
      statusCode: 429,
      message: passwordResetStatus.message,
      passwordResetStatus,
    };
  }

  const resetToken = uuidv4();
  const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);
  await authModel.setResetToken(user.user_id, resetToken, tokenExpiry);

  let emailResult;
  try {
    emailResult = await sendEmail({
      to: user.email,
      subject: "Reset Your BIOCELLA Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #113F67;">BIOCELLA Password Reset</h2>
          <p>We received a request to reset your password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_BASE_URL}/forgot-password/reset?token=${resetToken}"
               style="background-color: #113F67; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p>Sincerely,<br/><strong>BIOCELLA Team</strong></p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Forgot password email error:", emailError);
  }

  if (!didEmailSend(emailResult, user.email)) {
    await authModel.setResetToken(user.user_id, null, null);

    return {
      ok: false,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: "If an account exists, we couldn't send the reset email right now. Please try again later.",
    };
  }

  return {
    ok: true,
    statusCode: HttpStatus.OK,
    message: "Email sent successfully.",
    passwordResetStatus: buildPasswordResetStatus({
      ...user,
      reset_token: resetToken,
      reset_token_expires: tokenExpiry,
    }),
  };
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Email and password are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByEmail(email);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid credentials.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!user.password) {
      if (Number(user.is_setup_complete) === 1) {
        return res.status(HttpStatus.CONFLICT).json({
          message: "Your email is deactivated by the admin.",
          statusCode: HttpStatus.CONFLICT,
        });
      }

      return res.status(HttpStatus.CONFLICT).json({
        message: "Account setup is not complete. Please finish the setup process.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (user.lockout_until && new Date() < new Date(user.lockout_until)) {
      const remainingMs = new Date(user.lockout_until).getTime() - Date.now();
      const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: `Account is locked. Time remaining: ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const passwordMatch = await authModel.comparePassword(password, user.password);

    if (passwordMatch) {
      if (isSemesterReverificationDue(user)) {
        return res.status(428).json({
          ...buildReverificationPayload(user.email),
          statusCode: 428,
        });
      }

      await authModel.resetFailedLoginAttempts(user.user_id);

      const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.status(HttpStatus.OK).json({
        message: "Login was successful.",
        token,
        role: user.role,
        userId: user.user_id,
        email: user.email,
        statusCode: HttpStatus.OK,
      });
    }

    const newAttempts = user.failed_login_attempts + 1;
    let message = "Invalid email or password.";
    let lockoutTime = null;

    if (newAttempts >= 5) {
      lockoutTime = new Date(Date.now() + 15 * 60000);
      message = "Maximum login attempts exceeded. Account locked for 15 minutes.";
    }

    await authModel.incrementFailedLoginAttempts(user.user_id, newAttempts, lockoutTime);

    return res.status(HttpStatus.UNAUTHORIZED).json({
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during login.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Please enter a valid email address.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!authModel.validateEmailDomain(email)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Please enter a valid USC email address.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const existingUser = await authModel.getUserByEmail(email);
    if (existingUser) {
      if (existingUser.password) {
        return sendAuthMessageResponse(res, ACCOUNT_REGISTERED_MESSAGE, HttpStatus.CONFLICT);
      }

      const tokenExpiryMs = existingUser.reset_token_expires
        ? new Date(existingUser.reset_token_expires).getTime()
        : 0;
      const hasActiveFinalizeLink =
        Boolean(existingUser.reset_token) && tokenExpiryMs > Date.now();

      if (hasActiveFinalizeLink) {
        return res.status(HttpStatus.CONFLICT).json({
          message: "Please finish the setup process.",
          statusCode: HttpStatus.CONFLICT,
        });
      }

      const resetToken = uuidv4();
      const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);
      const resendResult = await sendFinalizeSetupEmail(email, resetToken);
      if (!resendResult.ok) {
        return res.status(resendResult.statusCode).json({
          message: resendResult.message,
          statusCode: resendResult.statusCode,
        });
      }

      await authModel.setResetToken(existingUser.user_id, resetToken, tokenExpiry);

      return res.status(HttpStatus.OK).json({
        message: "A new finalize setup link has been sent to your email.",
        statusCode: HttpStatus.OK,
      });
    }

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);
    const inferredRole = authModel.getRoleFromUscEmail(email);

    const emailResult = await sendFinalizeSetupEmail(email, resetToken);
    if (!emailResult.ok) {
      return res.status(emailResult.statusCode).json({
        message: emailResult.message,
        statusCode: emailResult.statusCode,
      });
    }

    const userId = await authModel.createUser(email, resetToken, tokenExpiry, inferredRole);

         return res.status(HttpStatus.CREATED).json({
           message: "Registration successful. Please check your email for a password setup link.",
      userId,
      email,
      statusCode: HttpStatus.CREATED,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during registration.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "A valid email address is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByEmail(email);

    if (!user) {
      return sendAuthMessageResponse(res, ACCOUNT_NOT_REGISTERED_MESSAGE, HttpStatus.NOT_FOUND);
    }

    // Only send reset email if account setup is complete
    if (Number(user.is_setup_complete) !== 1) {
      return sendAuthMessageResponse(res, ACCOUNT_NOT_REGISTERED_MESSAGE, HttpStatus.NOT_FOUND);
    }

    const resetResult = await issuePasswordResetForUser(user);
    if (!resetResult.ok && resetResult.statusCode === HttpStatus.SERVICE_UNAVAILABLE) {
      return sendAuthMessageResponse(res, ACCOUNT_REGISTERED_MESSAGE);
    }

    return res.status(resetResult.statusCode).json({
      message: resetResult.message,
      statusCode: resetResult.statusCode,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during forgot password.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// REQUEST PASSWORD RESET FOR AUTHENTICATED USER
exports.requestPasswordResetAuthenticated = async (req, res) => {
  try {
    const authUser = getAuthenticatedUserFromRequest(req);
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const profile = await authModel.getUserProfileById(userId);
    if (!profile?.email) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const user = await authModel.getUserByEmail(profile.email);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (isSemesterReverificationDue(user)) {
      return res.status(428).json({
        ...buildReverificationPayload(user.email),
        statusCode: 428,
      });
    }


    const resetResult = await issuePasswordResetForUser(user);
    return res.status(resetResult.statusCode).json({
      message: resetResult.message,
      ...(resetResult.passwordResetStatus
        ? { passwordResetStatus: resetResult.passwordResetStatus }
        : {}),
      statusCode: resetResult.statusCode,
    });
  } catch (error) {
    console.error("Authenticated Reset Password Request Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during password reset request.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// ADMIN INVITE
exports.adminInvite = async (req, res) => {
  try {
    const { email, role = "student" } = req.body;
    const normalizedRole = normalizeRole(role);

    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "A valid email address is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!normalizedRole || !ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Invalid role. Use student, faculty, or ra.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const existingUser = await authModel.getUserByEmail(email);
    
    // If user exists, check if they're in pending state (no password and setup incomplete)
    if (existingUser) {
      const isPending = existingUser.password === null && existingUser.is_setup_complete === 0;
      
      if (!isPending) {
        // User is fully registered, cannot re-invite
        return sendAuthMessageResponse(res, ACCOUNT_REGISTERED_MESSAGE, HttpStatus.CONFLICT);
      }
      
      // User is pending (expired token or incomplete signup) — update their reset token and re-send invite
      const resetToken = uuidv4();
      const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);

      const emailResult = await sendAdminInviteEmail(email, resetToken, normalizedRole);
      if (!emailResult.ok) {
        return res.status(emailResult.statusCode).json({
          message: emailResult.message,
          statusCode: emailResult.statusCode,
        });
      }

      // Update the pending user's reset token
      await authModel.updateUserRole(existingUser.user_id, normalizedRole);
      await authModel.setResetToken(existingUser.user_id, resetToken, tokenExpiry);

      return res.status(HttpStatus.OK).json({
        message: "New invitation link has been sent to the email. The previous link is no longer valid.",
        userId: existingUser.user_id,
        email,
        role: normalizedRole,
        statusCode: HttpStatus.OK,
      });
    }

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);

    const emailResult = await sendAdminInviteEmail(email, resetToken, normalizedRole);
    if (!emailResult.ok) {
      return res.status(emailResult.statusCode).json({
        message: emailResult.message,
        statusCode: emailResult.statusCode,
      });
    }

    const userId = await authModel.createUserByAdmin(email, resetToken, normalizedRole, tokenExpiry);

    return res.status(HttpStatus.CREATED).json({
      message: "User invited successfully. A password setup link has been sent to the email.",
      userId,
      email,
      role: normalizedRole,
      statusCode: HttpStatus.CREATED,
    });
  } catch (error) {
    console.error("Admin Invite Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during admin invite.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token and new password are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!authModel.validatePasswordStrength(newPassword)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: PASSWORD_STRENGTH_ERROR_MESSAGE,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByResetToken(token);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!user.password && !user.is_setup_complete) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "Account is not registered.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "This reset link has expired.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.password) {
      const isSameAsOld = await authModel.comparePassword(newPassword, user.password);
      if (isSameAsOld) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "New password must be different from your current password.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
    }

    const hashedPassword = await authModel.hashPassword(newPassword);
    const nextResetAllowedAt = new Date(Date.now() + RESET_COOLDOWN_MS);
    await authModel.setPassword(user.user_id, hashedPassword, nextResetAllowedAt);

    return res.status(HttpStatus.OK).json({
      message: "Password has been successfully reset.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Password Reset Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during password reset.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// FINALIZE SETUP
exports.finalizeSetup = async (req, res) => {
  try {
    const { token, email, first_name, last_name, profile_photo, department, course, password, retypePassword } = req.body;

    if (!token || !email || !first_name || !last_name || !department || !course || !password || !retypePassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "All fields are required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const userByToken = await authModel.getUserByResetToken(token);
    if (!userByToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (userByToken.reset_token_expires && new Date() > new Date(userByToken.reset_token_expires)) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "This setup link has expired. Request a new one.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (userByToken.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "The email address does not match this setup token.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (userByToken.password) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "Account setup is already complete. Please log in.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (password !== retypePassword) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Passwords do not match.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!authModel.validatePasswordStrength(password)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: PASSWORD_STRENGTH_ERROR_MESSAGE,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const hashedPassword = await authModel.hashPassword(password);

    await authModel.finalizeUserSetup(
      userByToken.user_id,
      first_name,
      last_name,
      profile_photo || null,
      department,
      course,
      hashedPassword
    );

    return res.status(HttpStatus.OK).json({
      message: "Signup finalized successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Finalize Setup Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during setup finalization.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// GET USER PROFILE
exports.getUserProfile = async (req, res) => {
  try {
    const authUser = getAuthenticatedUserFromRequest(req);
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const user = await authModel.getUserProfileById(userId);

    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (isSemesterReverificationDue(user)) {
      return res.status(428).json({
        ...buildReverificationPayload(user.email),
        statusCode: 428,
      });
    }

    const passwordResetAccount = await authModel.getUserByEmail(user.email);

    return res.status(HttpStatus.OK).json({
      message: "User profile retrieved.",
      user,
      passwordResetStatus: buildPasswordResetStatus(passwordResetAccount),
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// UPDATE USER PROFILE
exports.updateUserProfile = async (req, res) => {
  try {
    const authUser = getAuthenticatedUserFromRequest(req);
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    const existingUser = await authModel.getUserProfileById(userId);
    if (!existingUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const { department, course, profile_photo, newPassword, confirmPassword } = req.body || {};

    const nextDepartment = typeof department === "string" ? department.trim() : (existingUser.department || "");
    const nextCourse = typeof course === "string" ? course.trim() : (existingUser.course || "");
    const normalizedRole = String(existingUser.role || "").trim().toLowerCase();
    const canUpdateProfilePhoto = normalizedRole === "admin" || normalizedRole === "staff";
    const requestedProfilePhoto = typeof profile_photo === "string" ? profile_photo.trim() : null;

    if (!canUpdateProfilePhoto && requestedProfilePhoto !== null && requestedProfilePhoto !== (existingUser.profile_photo || "")) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: "Only admin and staff can update profile photos.",
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const nextProfilePhoto = canUpdateProfilePhoto
      ? (requestedProfilePhoto !== null ? requestedProfilePhoto : (existingUser.profile_photo || null))
      : (existingUser.profile_photo || null);

    let hashedPassword = null;
    const hasPasswordInput = Boolean(newPassword || confirmPassword);

    if (hasPasswordInput) {
      // Check if user is in password change cooldown period
      const resetTokenExpiryMs = existingUser.reset_token_expires
        ? new Date(existingUser.reset_token_expires).getTime()
        : 0;
      if (resetTokenExpiryMs > Date.now()) {
        const remainingMs = resetTokenExpiryMs - Date.now();
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return res.status(429).json({
          message: `You can change your password again in ${remainingHours} hour${remainingHours === 1 ? '' : 's'}.`,
          statusCode: 429,
        });
      }

      if (!newPassword || !confirmPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "Both new password and confirm password are required.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "New password and confirm password do not match.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      if (!authModel.validatePasswordStrength(newPassword)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: PASSWORD_STRENGTH_ERROR_MESSAGE,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      const isSameAsOld = await authModel.comparePassword(newPassword, existingUser.password);
      if (isSameAsOld) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: "New password must be different from your current password.",
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      hashedPassword = await authModel.hashPassword(newPassword);
    }

    await authModel.updateUserProfile({
      userId,
      department: nextDepartment,
      course: nextCourse,
      profilePhoto: nextProfilePhoto || null,
      hashedPassword,
      nextResetAllowedAt: hasPasswordInput ? new Date(Date.now() + RESET_COOLDOWN_MS) : null,
    });

    const updatedUser = await authModel.getUserProfileById(userId);

    return res.status(HttpStatus.OK).json({
      message: "Profile updated successfully.",
      user: updatedUser,
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Update User Profile Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// UPLOAD USER PROFILE PHOTO
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const authUser = getAuthenticatedUserFromRequest(req);
    const userId = authUser?.userId;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "User not authenticated.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (!req.file) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Profile image file is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const existingUser = await authModel.getUserProfileById(userId);
    if (!existingUser) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const normalizedRole = String(existingUser.role || "").trim().toLowerCase();
    if (normalizedRole !== "admin" && normalizedRole !== "staff") {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: "Only admin and staff can upload profile photos.",
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const profilePhotoPath = `/uploads/profiles/${req.file.filename}`;
    await authModel.updateUserProfilePhoto(userId, profilePhotoPath);

    const updatedUser = await authModel.getUserProfileById(userId);

    return res.status(HttpStatus.OK).json({
      message: "Profile photo uploaded successfully.",
      profile_photo: profilePhotoPath,
      user: updatedUser,
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Upload Profile Photo Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// GET USER BY TOKEN
exports.getUserByToken = async (req, res) => {
  try {
    const { token, purpose } = req.body;

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByResetToken(token);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    // Check if token has expired
    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "This token has expired. Please request a new one.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (purpose !== "reset-password" && Number(user.is_setup_complete) === 1) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "Account setup is already complete. Please log in.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User data retrieved successfully.",
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        course: user.course,
        role: user.role,
        is_setup_complete: user.is_setup_complete || 0,
        profile_photo: user.profile_photo || null,
      },
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Get User By Token Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// GET RESET USER BY TOKEN
exports.getResetUserByToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByResetToken(token);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "This reset link has expired. Please request a new one.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User data retrieved successfully.",
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        course: user.course,
        role: user.role,
        is_setup_complete: user.is_setup_complete || 0,
        profile_photo: user.profile_photo || null,
      },
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Get Reset User By Token Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// LOGOUT
exports.logout = async (_req, res) => {
  return res.status(HttpStatus.OK).json({
    message: "Logout successful.",
    statusCode: HttpStatus.OK,
  });
};

// GET ALL NON-ADMIN USERS
exports.getUsers = async (_req, res) => {
  try {
    const users = await authModel.getAllNonAdminUsers();
    return res.status(HttpStatus.OK).json({ users, statusCode: HttpStatus.OK });
  } catch (error) {
    console.error("Get Users Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch users.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// UPDATE USER ROLE
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;
    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Role is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Invalid role. Use student, faculty, or ra.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const affected = await authModel.updateUserRole(id, normalizedRole);

    if (!affected) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User not found or cannot update admin role.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User role updated successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update user role.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// DEACTIVATE USER (SOFT DELETE ACCOUNT ACCESS)
exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const affected = await authModel.deactivateUser(id);

    if (!affected) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User not found, already deactivated, or account setup is incomplete.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "User deactivated successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Deactivate User Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to deactivate user.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// REACTIVATE USER AND SEND PASSWORD RESET EMAIL
exports.reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await authModel.getUserAuthById(id);
    if (!user || String(user.role || "").toLowerCase() === "admin") {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const isDeactivated = Boolean(user.deleted_at);
    if (!isDeactivated) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "User is not deactivated.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + RESET_LINK_TTL_MS);
    await authModel.setResetToken(user.user_id, resetToken, tokenExpiry);

    const isSetupComplete = Number(user.is_setup_complete) === 1;
    const emailResult = isSetupComplete
      ? await sendReactivationEmail(user.email, resetToken)
      : await sendFinalizeSetupEmail(user.email, resetToken);

    if (!emailResult.ok) {
      await authModel.setResetToken(user.user_id, null, null);
      return res.status(emailResult.statusCode).json({
        message: emailResult.message,
        statusCode: emailResult.statusCode,
      });
    }

    await authModel.reactivateUser(user.user_id);

    return res.status(HttpStatus.OK).json({
      message: isSetupComplete
        ? "User reactivated. Password reset email sent successfully."
        : "User reactivated. Finalize setup email sent successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Reactivate User Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to reactivate user.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// VERIFY JWT TOKEN
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await authModel.getUserAuthById(decoded.userId);

    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    if (isSemesterReverificationDue(user)) {
      return res.status(428).json({
        ...buildReverificationPayload(user.email),
        statusCode: 428,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "Token is valid.",
      user: decoded,
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Token Verification Error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Token has expired.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
    return res.status(HttpStatus.UNAUTHORIZED).json({
      message: "Invalid token.",
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
};

// VERIFY GOOGLE ID TOKEN AND RETURN PROFILE
exports.verifyGoogleProfile = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Google ID token is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const ticket = await googleOauthClient.verifyIdToken({
      idToken: token,
      audience: process.env.GMAIL_CLIENT_ID,
    });
    const profile = ticket.getPayload();

    if (!profile) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Invalid Google token.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (email && profile.email && profile.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "Google email does not match the signup email.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    return res.status(HttpStatus.OK).json({
      message: "Google profile verified.",
      profile: {
        email: profile.email,
        email_verified: profile.email_verified,
        name: profile.name,
        first_name: profile.given_name,
        last_name: profile.family_name,
        picture: profile.picture,
      },
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Verify Google Profile Error:", error);

    const errorMessage = String(error?.message || "").toLowerCase();
    const isClientTokenError =
      error?.code === 401 ||
      error?.code === 400 ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("expired") ||
      errorMessage.includes("token") ||
      errorMessage.includes("jwt");

    if (isClientTokenError) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: "Invalid or expired Google token.",
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Failed to verify Google token.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

// COMPLETE SEMESTER RE-VERIFICATION
exports.completeReverification = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "A valid email address is required.",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const user = await authModel.getUserByEmail(email);
    if (!user) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: "User profile not found.",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (Number(user.is_setup_complete) !== 1 || !user.password) {
      return res.status(HttpStatus.CONFLICT).json({
        message: "Account setup is not complete.",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    await authModel.markUserVerified(user.user_id);

    return res.status(HttpStatus.OK).json({
      message: "Account re-verification completed successfully.",
      statusCode: HttpStatus.OK,
    });
  } catch (error) {
    console.error("Complete Reverification Error:", error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "An unexpected error occurred during re-verification.",
      error: error.message || error,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

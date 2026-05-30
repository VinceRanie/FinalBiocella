const nodemailer = require('nodemailer');

// 🔎 Debugging: log env variables at startup
console.log('🔎 Email transport config check:');
console.log('  Gmail OAuth2:');
console.log('    Client ID:', process.env.GMAIL_CLIENT_ID || '❌ Missing');
console.log('    Client Secret:', process.env.GMAIL_CLIENT_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('    Refresh Token:', process.env.GMAIL_REFRESH_TOKEN ? '✅ Loaded' : '❌ Missing');
console.log('    User Email:', process.env.GMAIL_USER || '❌ Missing');
console.log('  SMTP Fallback (Port 587):');
console.log('    Host:', process.env.SMTP_HOST || '❌ Missing');
console.log('    User:', process.env.SMTP_USER || '❌ Missing');
console.log('    Pass:', process.env.SMTP_PASS ? '✅ Loaded' : '❌ Missing');

// OAuth2 credentials for Gmail send
const hasGmailOAuthConfig = !!(
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN &&
  process.env.GMAIL_USER
);

// SMTP fallback credentials
const hasSmtpFallbackConfig = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const hasGmailConfig = hasGmailOAuthConfig || hasSmtpFallbackConfig;

if (!hasGmailConfig) {
  console.warn('⚠️  Warning: No email credentials configured. Email notifications will be skipped.');
}

let oauth2Client = null;
let google = null;
let googleInitError = null;
let cachedTransporter = null;

try {
  google = require('googleapis').google;
  console.log('✅ googleapis module loaded successfully');
} catch (error) {
  console.warn('⚠️  Warning: googleapis module not available. Gmail notifications will be disabled.');
  console.warn('   Install with: npm install googleapis');
  googleInitError = error;
}

const initializeGoogleAuth = () => {
  try {
    if (oauth2Client) return;

    if (!google) {
      if (googleInitError) {
        throw new Error('googleapis module failed to load: ' + googleInitError.message);
      }
      throw new Error('googleapis module not available');
    }

    if (!hasGmailOAuthConfig) {
      console.warn('Cannot initialize Google Auth: Gmail credentials are missing');
      return;
    }

    oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    console.log('✅ Google OAuth2 initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Google OAuth2:', error);
    oauth2Client = null;
    throw error;
  }
};

const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  try {
    // Try OAuth2 first
    if (!oauth2Client && hasGmailOAuthConfig) {
      initializeGoogleAuth();
    }

    if (oauth2Client) {
      try {
        let accessToken;
        try {
          accessToken = await oauth2Client.getAccessToken();
        } catch (error) {
          console.error("❌ OAuth2 refresh token failed:", error.message);
          console.error("   Attempting SMTP fallback...");
          throw error;
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: accessToken?.token
          },
          tls: { rejectUnauthorized: true },
          connectionTimeout: 10000
        });

        cachedTransporter = transporter;
        console.log('✅ Email transporter: Using Gmail OAuth2');
        return transporter;
      } catch (oauthError) {
        // OAuth2 failed, fall back to SMTP if available
        if (!hasSmtpFallbackConfig) {
          throw new Error(
            'Gmail OAuth2 failed and no SMTP fallback configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
          );
        }
        console.log('⚠️  OAuth2 failed, using SMTP fallback...');
      }
    }

    // Use SMTP fallback
    if (hasSmtpFallbackConfig) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // 587 uses STARTTLS, not TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: true },
        connectionTimeout: 10000
      });

      cachedTransporter = transporter;
      console.log(`✅ Email transporter: Using SMTP fallback (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`);
      return transporter;
    }

    // No method available
    throw new Error(
      'No email transport configured. Please set either Gmail OAuth2 or SMTP credentials.'
    );
  } catch (error) {
    console.error('❌ Error creating email transporter:', error.message);
    throw error;
  }
};

const sendEmail = async (mailOptions) => {
  try {
    if (!hasGmailConfig) {
      console.warn('⚠️  Email sending skipped: no mail transport is configured');
      console.log(`📧 Email would have been sent to: ${mailOptions.to}`);
      console.log(`📧 Subject: ${mailOptions.subject}`);
      return { messageId: 'SKIPPED_NO_CONFIG' };
    }

    const transporter = await createTransporter();

    const info = await transporter.sendMail({
      from: `"BIOCELLA" <${process.env.GMAIL_USER}>`,
      ...mailOptions
    });
    console.log('📧 Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { error: error.message, messageId: null };
  }
};

// 🔹 Helper to test OAuth2 refresh token
const testRefreshToken = async () => {
  try {
    if (!oauth2Client && hasGmailOAuthConfig) {
      initializeGoogleAuth();
    }
    if (!oauth2Client) {
      console.error('❌ No OAuth2 client available. Check Gmail OAuth2 config.');
      return;
    }

    const accessToken = await oauth2Client.getAccessToken();
    console.log('✅ OAuth2 refresh token works. Access token issued.');
  } catch (err) {
    console.error('❌ OAuth2 refresh token failed:', err.message || err);
  }
};

// 🔹 Helper to test SMTP connection
const testSmtpConnection = async () => {
  if (!hasSmtpFallbackConfig) {
    console.error('❌ SMTP not configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10000
    });

    await transporter.verify();
    console.log(`✅ SMTP connection successful (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`);
  } catch (err) {
    console.error(`❌ SMTP connection failed (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}):`, err.message || err);
  }
};

module.exports = {
  sendEmail,
  createTransporter,
  hasGmailConfig,
  testRefreshToken,
  testSmtpConnection // export new helper
};

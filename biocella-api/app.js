require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const connectMongo = require('./config/mongo');
const mainRoutes = require('./routes/routes');
const { testRefreshToken } = require('./config/email.js'); // ✅ import the helper
const Appointment = require('./models/appointmentModel');

// Global error handlers - prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// Enable CORS
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:3000',
    'https://it-3105-n-repo-98sx.vercel.app',
    'https://it-3105-n-repo-sqsf.vercel.app',
    'https://test-biocella.vercel.app',
    'https://test22.dcism.org',
    'https://testbiocella.dcism.org'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', mainRoutes);

app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectMongo();

    // Run Gmail refresh token check at startup, but don’t block server if it fails
    try {
      await testRefreshToken();
    } catch (error) {
      console.warn('⚠️ Gmail refresh token check failed at startup:', error.message);
      console.warn('   Email sending may still work when retried.');
    }

    // Auto-deny past pending appointments on startup (and notify users)
    try {
      const deniedCount = await (async () => {
        const result = await Appointment.autoDenyPastPendingAppointments();
        return Array.isArray(result) ? result.length : Number(result) || 0;
      })();
      if (deniedCount > 0) {
        console.log(`📋 Auto-denied ${deniedCount} past pending appointment(s) on startup`);
      }
    } catch (error) {
      console.warn('⚠️ Auto-deny past pending appointments failed on startup:', error.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log('📊 Hybrid database system ready (MySQL + MongoDB)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  process.exit(0);
});

startServer();

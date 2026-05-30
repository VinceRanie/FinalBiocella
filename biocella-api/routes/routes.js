const express = require('express');
const router = express.Router();
const blastController = require('../controllers/blastController');


// Sub-route groups
// Authentication Routes
router.use('/auth', require('./authRoutes'));

// router.use('/users', require('./userRoutes'));
router.use('/microbials', require('./microbialRoutes'));
router.use('/projects', require('./projectRoutes'));
router.use('/morphology', require('./morphologyRoutes'));
router.use('/biochemical', require('./biochemicalRoutes'));
router.use('/genome', require('./genomeRoutes'));
router.use('/bioactivity', require('./bioactivityRoutes'));
router.use('/resource', require('./resourceRoutes'));
router.use('/collection-activity', require('./collectionActivityRoutes'));
router.use('/announcements', require('./announcementRoutes'));

// Appointment Routes
router.use('/appointments', require('./appointmentRoutes'));

// Chemical Management Routes
router.use('/chemicals', require('./chemicalRoutes'));
router.use('/batches', require('./batchRoutes'));
router.use('/usage', require('./usageRoutes'));
router.use('/reports', require('./reportRoutes'));

//Blaast
router.post('/submit', blastController.runBlast);
router.get('/result', blastController.getBlastResult);

module.exports = router;

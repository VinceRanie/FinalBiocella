const express = require('express');
const router = express.Router();
const bioactivityController = require('../controllers/bioactivityController');

router.post('/', bioactivityController.createBioactivity);
router.get('/', bioactivityController.getBioactivities);
router.get('/:id', bioactivityController.getBioactivityById);
router.put('/:id', bioactivityController.updateBioactivity);
router.delete('/:id', bioactivityController.deleteBioactivity);

module.exports = router;

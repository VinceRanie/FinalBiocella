const express = require('express');
const router = express.Router();
const collectionActivityController = require('../controllers/collectionActivityController');

router.get('/', collectionActivityController.getAll);

module.exports = router;

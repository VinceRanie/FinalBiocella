const express = require('express');
const router = express.Router();
const controller = require('../controllers/biochemicalController');

router.post('/', controller.createBiochemical);
router.get('/:microbial_id', controller.getByMicrobialId);
router.put('/:microbial_id', controller.updateBiochemical);
router.delete('/:microbial_id', controller.deleteBiochemical);

module.exports = router;

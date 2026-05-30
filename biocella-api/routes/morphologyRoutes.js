const express = require('express');
const router = express.Router();
const controller = require('../controllers/morphologyController');

router.post('/', controller.createMorphology);
router.get('/:microbial_id', controller.getByMicrobialId);
router.put('/:microbial_id', controller.updateMorphology);
router.delete('/:microbial_id', controller.deleteMorphology);

module.exports = router;

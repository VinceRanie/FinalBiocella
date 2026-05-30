const express = require('express');
const router = express.Router();
const genomeController = require('../controllers/genomeController');

router.post('/', genomeController.createGenome);
router.get('/', genomeController.getGenomes);
router.get('/:id', genomeController.getGenomeById);
router.put('/:id', genomeController.updateGenome);
router.delete('/:id', genomeController.deleteGenome);

module.exports = router;

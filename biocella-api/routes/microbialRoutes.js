const express = require('express');
const router = express.Router();
const microbialController = require('../controllers/microbialController');
const microbialImportController = require('../controllers/microbialImportController');
const upload = require('../config/upload');

// Accept both image and fasta_file uploads
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'fasta_file', maxCount: 1 },
  { name: 'custom_images', maxCount: 30 }
]);

router.get('/import-batches', microbialImportController.listImportBatches);
router.post('/import-batches', microbialImportController.createImportBatch);
router.get('/import-batches/:id', microbialImportController.getImportBatchById);
router.post('/import-batches/:id/approve', microbialImportController.approveImportBatch);
router.post('/import-batches/:id/reject', microbialImportController.rejectImportBatch);

router.post('/', uploadFields, microbialController.createMicrobial);
router.get('/', microbialController.getMicrobials);
router.get('/public/stats', microbialController.getPublicStats);
router.get('/:id', microbialController.getMicrobialById);
router.put('/:id', uploadFields, microbialController.updateMicrobial);
router.delete('/:id', microbialController.deleteMicrobial);

// BLAST submission endpoint
router.post('/:id/blast', microbialController.submitBlast);
router.get('/:id/blast/results', microbialController.getBlastResults);

module.exports = router;

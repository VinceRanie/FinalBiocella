const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const uploadDirs = {
  specimens: path.join(__dirname, '../uploads/specimens'),
  fasta: path.join(__dirname, '../uploads/fasta'),
  announcements: path.join(__dirname, '../uploads/announcements')
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for specimens (images)
const specimenStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'fasta_file') {
      cb(null, uploadDirs.fasta);
    } else if (file.fieldname === 'announcement_images') {
      cb(null, uploadDirs.announcements);
    } else {
      cb(null, uploadDirs.specimens);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter - accept images and FASTA files (strict)
const fileFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const textTypes = ['text/plain', 'application/octet-stream']; // common types for FASTA uploads
  const allowedFastaExts = new Set(['.fasta', '.fa', '.fna', '.ffn', '.faa']);

  if (file.fieldname === 'image' || file.fieldname === 'custom_images' || file.fieldname === 'announcement_images') {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  } else if (file.fieldname === 'fasta_file') {
    const ext = path.extname(file.originalname).toLowerCase();
    if ((textTypes.includes(file.mimetype) && allowedFastaExts.has(ext)) || allowedFastaExts.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid FASTA file type. Only FASTA files (.fasta, .fa, .fna, .ffn, .faa) are allowed.'), false);
    }
  } else {
    cb(new Error('Unexpected field name'), false);
  }
};

// Configure multer
const upload = multer({
  storage: specimenStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size (increased for FASTA files)
  }
});

module.exports = upload;

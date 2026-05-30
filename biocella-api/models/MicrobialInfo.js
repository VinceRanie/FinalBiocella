const mongoose = require('mongoose');
const { Schema } = mongoose;

const microbialInfoSchema = new Schema({
  // Required core fields
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  code_name: { type: String, required: true },
  classification: { type: String, required: true },
  source: String,
  date_accessed: Date,
  
  // Media
  image_url: String,
  qr_code: String,
  
  // Location & Project Info
  locale: String,
  project_fund: String,
  
  // Molecular/Genetic Data
  fasta_file: String, // Path to uploaded FASTA file
  fasta_sequence: String, // Actual sequence text
  accession_no: String,
  similarity_percent: Number,
  blast_rid: String, // BLAST Request ID for tracking
  blast_results: { type: Schema.Types.Mixed }, // Top 10 similar sequences
  blast_rid_expired_at: Date, // Timestamp when BLAST RID becomes invalid (24-36 hours after submission)
  
  // Biochemical Tests
  biochemical_tests: {
    onpg: String,
    glu: String,
    adh: String,
    man: String,
    ldc: String,
    ino: String,
    odc: String,
    sor: String,
    cit: String,
    rha: String,
    h2s: String,
    sac: String,
    ure: String,
    mel: String,
    tda: String,
    amy: String,
    ind: String,
    ara: String,
    vp: String,
    no2: String,
    gel: String
  },
  
  // Microbiological Properties
  catalase: String,
  hemolysis: String,
  oxidase: String,
  
  // Culture Requirements
  growth_media: String,
  special_reqs: String,
  activity: String,
  result: String,

  // Cell and Colony Morphology
  morphology: {
    shape: String,
    cell_size: String,
    colony_size: String,
    pigmentation: String,
    form: String,
    elevation: String,
    margin: String,
    colony_surface: String,
    opacity: String,
    texture: String,
    spore_formation: String,
    mycelium_formation: String,
    description: String
  },
  
  // Description/Notes
  description: String,
  created_by: String,
  update_notes: String,
  updated_by: String,
  
  // Flexible custom fields for any additional data
  custom_fields: { type: Schema.Types.Mixed },
  
  // Metadata
  publish_status: {
    type: String,
    enum: ['published', 'unpublished'],
    default: 'unpublished'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { strict: false }); // Allow dynamic fields

// Update timestamp on save
microbialInfoSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('MicrobialInfo', microbialInfoSchema, 'Microbial_Info');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const importBatchRowSchema = new Schema({
  row_number: { type: Number, required: true },
  original_row: { type: Schema.Types.Mixed, required: true },
  normalized_row: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['ready', 'invalid', 'approved', 'failed'],
    default: 'ready',
  },
  errors: { type: [String], default: [] },
  warnings: { type: [String], default: [] },
  specimen_id: { type: Schema.Types.ObjectId, ref: 'MicrobialInfo', default: null },
  error_message: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  approved_at: { type: Date, default: null },
}, { _id: false });

const importBatchSchema = new Schema({
  source_file_name: { type: String, default: '' },
  role: { type: String, default: '' },
  created_by: { type: String, default: '' },
  created_by_user_id: { type: Number, default: null },
  reviewed_by: { type: String, default: '' },
  reviewed_by_user_id: { type: Number, default: null },
  approved_by: { type: String, default: '' },
  approved_by_user_id: { type: Number, default: null },
  rejected_by: { type: String, default: '' },
  rejected_by_user_id: { type: Number, default: null },
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected', 'partially_approved', 'failed'],
    default: 'pending_review',
  },
  headers: { type: [String], default: [] },
  mapping: { type: Schema.Types.Mixed, default: {} },
  summary: {
    total_rows: { type: Number, default: 0 },
    ready_rows: { type: Number, default: 0 },
    invalid_rows: { type: Number, default: 0 },
    approved_rows: { type: Number, default: 0 },
    failed_rows: { type: Number, default: 0 },
  },
  rows: { type: [importBatchRowSchema], default: [] },
  notes: { type: String, default: '' },
  audit_trail: {
    type: [new Schema({
      action: { type: String, required: true },
      user: { type: String, default: '' },
      user_id: { type: Number, default: null },
      note: { type: String, default: '' },
      at: { type: Date, default: Date.now },
    }, { _id: false })],
    default: [],
  },
  reviewed_at: { type: Date, default: null },
  approved_at: { type: Date, default: null },
  rejected_at: { type: Date, default: null },
  approved_count: { type: Number, default: 0 },
  failed_count: { type: Number, default: 0 },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('MicrobialImportBatch', importBatchSchema, 'Microbial_Import_Batches');
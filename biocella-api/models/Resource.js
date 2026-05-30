const mongoose = require('mongoose');
const { Schema } = mongoose;

const resourceSchema = new Schema({
  code: {
    type: String,
    required: false,      // ✅ Make it optional
    default: null         // ✅ Set default if not provided
    // Still relates to Microbial_Info.accession_number manually
  },
  resource_id: {
    type: String,         // Refers to another Resource.code
    default: null
  },
  custom_fields: {
    type: Schema.Types.Mixed
  }
}, { strict: true, timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema, 'Resource');


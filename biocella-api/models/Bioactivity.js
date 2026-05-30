const mongoose = require('mongoose');
const { Schema } = mongoose;

const bioactivitySchema = new Schema({
  microbial_id: { type: Schema.Types.ObjectId, required: true, ref: 'Microbial_Info' },
  custom_fields: { type: Schema.Types.Mixed }
}, { strict: true, timestamps: true });

module.exports = mongoose.model('Bioactivity', bioactivitySchema, 'Bioactivity');
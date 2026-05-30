const mongoose = require('mongoose');
const { Schema } = mongoose;

const genomeSchema = new Schema({
  microbial_id: { type: Schema.Types.ObjectId, required: true, ref: 'Microbial_Info' },
  custom_fields: { type: Schema.Types.Mixed }
}, { strict: true, timestamps: true });

module.exports = mongoose.model('Genome_Sequence', genomeSchema, 'Genome_Sequence');


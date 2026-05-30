const mongoose = require('mongoose');
const { Schema } = mongoose;

const morphologySchema = new Schema(
  {
    microbial_id: {
      type: Schema.Types.ObjectId,
      ref: 'MicrobialInfo',
      required: true,
    },
    // dynamic fields added by user go here
  },
  {
    strict: false,              // allow dynamic fields
    strictQuery: true,          // only allow querying known fields
    strictSchemaPaths: true     // always enforce microbial_id
  }
);

module.exports = mongoose.model('Morphology', morphologySchema, 'Morphology');


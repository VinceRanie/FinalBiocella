const mongoose = require('mongoose');
const { Schema } = mongoose;

const biochemicalSchema = new Schema(
  {
    microbial_id: {
      type: Schema.Types.ObjectId,
      ref: 'Microbial_Info',
      required: true,
    },
    // dynamic fields allowed
  },
  {
    strict: false,
    strictQuery: true,
    strictSchemaPaths: true
  }
);

module.exports = mongoose.model('Biochemical', biochemicalSchema, 'Biochemical');

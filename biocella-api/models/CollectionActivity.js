const mongoose = require('mongoose');

const { Schema } = mongoose;

const collectionActivitySchema = new Schema({
  specimen_id: { type: Schema.Types.ObjectId, ref: 'MicrobialInfo', required: true },
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: false },
  user_id: { type: Number, required: false },
  action: { type: String, required: true },
  status: { type: String, required: false },
  description: { type: String, required: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CollectionActivity', collectionActivitySchema);

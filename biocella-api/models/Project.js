const mongoose = require('mongoose');
const { Schema } = mongoose;

const projectSchema = new Schema({
  title: String,
  code: String,
  classification: String,
  user_id: Number // Reference to MySQL User table
});

// ✅ Export the model
module.exports = mongoose.model('Project', projectSchema);

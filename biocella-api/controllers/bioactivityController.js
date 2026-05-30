const Bioactivity = require('../models/Bioactivity');

exports.createBioactivity = async (req, res) => {
  try {
    const { microbial_id, custom_fields } = req.body;

    const newBio = new Bioactivity({
      microbial_id,
      custom_fields
    });

    const saved = await newBio.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Bioactivity insert error:", err);
    res.status(400).json({ error: err.message });
  }
};


exports.getBioactivities = async (req, res) => {
  const bios = await Bioactivity.find();
  res.json(bios);
};

exports.getBioactivityById = async (req, res) => {
  const bio = await Bioactivity.findById(req.params.id);
  if (!bio) return res.status(404).json({ error: 'Not found' });
  res.json(bio);
};

exports.updateBioactivity = async (req, res) => {
  try {
    const updated = await Bioactivity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteBioactivity = async (req, res) => {
  await Bioactivity.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted successfully' });
};

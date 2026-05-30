const Morphology = require('../models/Morphology');

// CREATE
exports.createMorphology = async (req, res) => {
  try {
    if (!req.body.microbial_id) {
      return res.status(400).json({ error: 'microbial_id is required' });
    }

    const doc = await Morphology.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    console.error(err); // log to terminal so you can see it
    res.status(500).json({ error: err.message }); // send error to frontend
  }
};

// READ ONE
exports.getByMicrobialId = async (req, res) => {
  try {
    const doc = await Morphology.findOne({ microbial_id: req.params.microbial_id });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateMorphology = async (req, res) => {
  try {
    const updated = await Morphology.findOneAndUpdate(
      { microbial_id: req.params.microbial_id },
      req.body,
      { new: true, upsert: false }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteMorphology = async (req, res) => {
  try {
    await Morphology.findOneAndDelete({ microbial_id: req.params.microbial_id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

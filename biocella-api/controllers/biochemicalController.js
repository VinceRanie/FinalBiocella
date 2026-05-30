const Biochemical = require('../models/BiochemicalCharacteristics');

exports.createBiochemical = async (req, res) => {
  try {
    if (!req.body.microbial_id) {
      return res.status(400).json({ error: 'microbial_id is required' });
    }

    const doc = await Biochemical.create(req.body);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getByMicrobialId = async (req, res) => {
  try {
    const doc = await Biochemical.findOne({ microbial_id: req.params.microbial_id });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateBiochemical = async (req, res) => {
  try {
    const updated = await Biochemical.findOneAndUpdate(
      { microbial_id: req.params.microbial_id },
      req.body,
      { new: true, upsert: false }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteBiochemical = async (req, res) => {
  try {
    await Biochemical.findOneAndDelete({ microbial_id: req.params.microbial_id });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const Genome = require('../models/GenomeSequence');

exports.createGenome = async (req, res) => {
  try {
    const { microbial_id, custom_fields } = req.body;

    const newGenome = new Genome({
      microbial_id,
      custom_fields
    });

    const saved = await newGenome.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Genome insert error:", err);
    res.status(400).json({ error: err.message });
  }
};


exports.getGenomes = async (req, res) => {
  const genomes = await Genome.find();
  res.json(genomes);
};

exports.getGenomeById = async (req, res) => {
  const genome = await Genome.findById(req.params.id);
  if (!genome) return res.status(404).json({ error: 'Not found' });
  res.json(genome);
};

exports.updateGenome = async (req, res) => {
  try {
    const updated = await Genome.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteGenome = async (req, res) => {
  await Genome.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted successfully' });
};

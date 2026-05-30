const Resource = require('../models/Resource');
const Microbial = require('../models/MicrobialInfo');

exports.createResource = async (req, res) => {
  try {
    const { code, resource_id, ...custom_fields } = req.body;

    if (code) {
      const microbial = await Microbial.findOne({ accession_number: code });
      if (!microbial) {
        return res.status(400).json({
          error: `Microbial_Info accession_number '${code}' not found.`
        });
      }
    }

    const newResource = new Resource({
      code: code || null, // fallback to null if undefined
      resource_id: resource_id || null,
      custom_fields
    });

    const saved = await newResource.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Resource insert error:", err);
    res.status(400).json({ error: err.message });
  }
};


exports.getResources = async (req, res) => {
  const resources = await Resource.find();
  res.json(resources);
};

exports.getResourceById = async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  res.json(resource);
};

exports.updateResource = async (req, res) => {
  try {
    const updated = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteResource = async (req, res) => {
  await Resource.findByIdAndDelete(req.params.id);
  res.json({ message: 'Resource deleted successfully' });
};

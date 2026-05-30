const Project = require('../models/Project');
const mysql = require('../config/mysql'); // connection pool

const normalizeCodeValue = (value) => String(value || '').trim().toLowerCase();

const findProjectDuplicate = async (code, excludeId = null) => {
  const normalizedCode = normalizeCodeValue(code);
  if (!normalizedCode) return null;

  const filter = {
    code: new RegExp(`^${normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Project.findOne(filter).lean();
};

// CREATE
exports.createProject = async (req, res) => {
  try {
    const { title, code, classification, user_id } = req.body;

    if (!String(code || '').trim()) {
      return res.status(400).json({ message: 'Project code is required.' });
    }

    const duplicate = await findProjectDuplicate(code);
    if (duplicate) {
      return res.status(409).json({ message: 'Project code already exists. Use a unique project code.' });
    }

    // Check if user_id exists in SQL
    // const [rows] = await mysql.execute('SELECT * FROM User WHERE user_id = ?', [user_id]);
    // if (rows.length === 0) {
    //   return res.status(400).json({ message: 'User not found in SQL database.' });
    // }

    const project = new Project({ title, code, classification, user_id });
    await project.save();

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating project.' });
  }
};

// READ ALL
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects.' });
  }
};

// READ ONE
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch project.' });
  }
};

// UPDATE
exports.updateProject = async (req, res) => {
  try {
    const { title, code, classification, user_id } = req.body;

    if (!String(code || '').trim()) {
      return res.status(400).json({ message: 'Project code is required.' });
    }

    const duplicate = await findProjectDuplicate(code, req.params.id);
    if (duplicate) {
      return res.status(409).json({ message: 'Project code already exists. Use a unique project code.' });
    }

    if (user_id) {
      const [rows] = await mysql.execute('SELECT * FROM User WHERE user_id = ?', [user_id]);
      if (rows.length === 0) {
        return res.status(400).json({ message: 'User not found in SQL database.' });
      }
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { title, code, classification, user_id },
      { new: true }
    );

    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project.' });
  }
};

// DELETE
exports.deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project.' });
  }
};

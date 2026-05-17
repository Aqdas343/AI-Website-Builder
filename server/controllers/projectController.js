import Project from '../models/Project.js';

export const getAll = async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required' });

    const project = await Project.create({
      userId: req.user.id,
      name,
      websiteSchema: { theme: {}, layout: {}, sections: [] },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { websiteSchema, name } = req.body;

    const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (name) project.name = name;
    if (websiteSchema) {
      project.websiteSchema = websiteSchema;
      project.markModified('websiteSchema');
    }

    await project.save();
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const duplicate = async (req, res) => {
  try {
    const original = await Project.findOne({ _id: req.params.id, userId: req.user.id });
    if (!original) return res.status(404).json({ message: 'Project not found' });

    const copy = await Project.create({
      userId: req.user.id,
      name: `Copy of ${original.name}`,
      websiteSchema: original.websiteSchema,
    });

    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

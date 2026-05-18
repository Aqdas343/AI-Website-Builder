import websiteQueue, { addGenerationJob } from '../queues/websiteQueue.js';
import { regenerateSection as regenerateSectionService } from '../services/regenerationService.js';
import Project from '../models/Project.js';

export const generate = async (req, res) => {
  try {
    let { prompt, projectName } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ message: 'Prompt must be under 2000 characters' });
    }

    // Strip HTML tags (S2)
    prompt = prompt.replace(/<[^>]*>?/gm, '');

    const job = await addGenerationJob({
      prompt: prompt.trim(),
      projectName,
      userId: req.user.id,
    });

    res.status(202).json({
      message: 'Website generation started',
      jobId: job.id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getJobStatus = async (req, res) => {
  try {
    console.log('[JobStatus] checking job:', req.params.jobId);
    const job = await websiteQueue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify job belongs to the user (S3)
    if (job.data.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const state = await job.getState();

    if (state === 'completed') {
      const { projectId } = job.returnvalue;
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      return res.status(200).json({
        status: 'completed',
        projectId,
        websiteSchema: project.websiteSchema,
      });
    }

    if (state === 'failed') {
      return res.status(200).json({
        status: 'failed',
        error: job.failedReason,
      });
    }

    const progressData = job.progress || null;
    console.log('[JobStatus] state:', state, 'progress:', JSON.stringify(progressData));
    return res.status(200).json({ 
      status: state,
      progress: progressData,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const regenerateSection = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sectionId, instruction } = req.body;

    if (!sectionId || !instruction) {
      return res.status(400).json({ message: 'sectionId and instruction are required' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const sections = [...project.websiteSchema.sections];
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) {
      return res.status(404).json({ message: 'Section not found' });
    }

    const updatedSection = await regenerateSectionService(sections[sectionIndex], instruction);

    // Create a new array and replace the section to avoid direct mutation (B13)
    const updatedSections = sections.map((s, i) => i === sectionIndex ? updatedSection : s);

    project.websiteSchema.sections = updatedSections;
    project.markModified('websiteSchema');
    await project.save();

    res.status(200).json({
      message: 'Section regenerated successfully',
      websiteSchema: project.websiteSchema,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

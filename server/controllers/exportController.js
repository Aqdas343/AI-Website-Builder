import archiver from 'archiver';
import Project from '../models/Project.js';
import { generateExportCode } from '../services/exportEngine.js';

export const exportProject = async (req, res) => {
  // Set 5-minute timeout for long-running AI generation (B16)
  req.setTimeout(5 * 60 * 1000);
  
  try {
    const { projectId } = req.params;

    const project = await Project.findOne({ _id: projectId, userId: req.user.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Pass project name to export engine
    const fileMap = await generateExportCode(project.websiteSchema, project.name);

    const zipName = `${project.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}-export.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    // Use a promise to wait for archive to finish
    const archiveFinished = new Promise((resolve, reject) => {
      archive.on('error', (err) => reject(err));
      archive.on('end', () => resolve());
      res.on('error', (err) => reject(err));
    });

    archive.pipe(res);

    const MAX_FILE_SIZE = 500 * 1024; // 500KB limit per file (B14)

    for (const [filePath, fileContent] of Object.entries(fileMap)) {
      if (typeof fileContent !== 'string') continue;
      
      if (fileContent.length > MAX_FILE_SIZE) {
        archive.append(fileContent.slice(0, MAX_FILE_SIZE), { name: filePath });
      } else {
        archive.append(fileContent, { name: filePath });
      }
    }

    await archive.finalize();
    await archiveFinished;
  } catch (error) {
    console.error('Export Request Failed:', {
      projectId: req.params.projectId,
      message: error.message,
      stack: error.stack
    });
    
    if (!res.headersSent) {
      res.status(500).json({ message: 'Export failed', error: error.message });
    }
  }
};

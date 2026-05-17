import { Worker } from 'bullmq';
import connection from '../config/redis.js';

import { analyzePrompt } from '../services/promptAnalyzer.js';
import { generateLayout } from '../services/layoutEngine.js';
import { generateTheme } from '../services/themeEngine.js';
import { generateComponents } from '../services/componentGenerator.js';
import { buildSchema } from '../services/schemaBuilder.js';
import Project from '../models/Project.js';

const worker = new Worker(
  'website-generation',
  async (job) => {
    const { prompt, userId, projectName } = job.data;
    let currentStep = 'Analyzing prompt';

    try {
      currentStep = 'Analyzing intent';
      const analysis = await analyzePrompt(prompt);

      currentStep = 'Generating layout';
      const layout = await generateLayout(analysis);
      
      currentStep = 'Generating theme';
      const theme = await generateTheme(analysis);

      currentStep = 'Building components';
      const components = await generateComponents(layout, analysis);

      const requiredSectionTypes = layout.sections.map(s => s.type);
      const generatedTypes = components.map(c => c.type);
      const missingSections = requiredSectionTypes.filter(t => !generatedTypes.includes(t));
      
      if (missingSections.length > 0 && missingSections.length >= requiredSectionTypes.length) {
        throw new Error(`Missing sections after generation: ${missingSections.join(', ')}`);
      }

      const globalAnimationTypes = analysis.animations?.types || [];

      const validatedComponents = components.map((c) => {
        const baseAnimations = c.animations || {
          entry: 'fade-up',
          duration: 0.6,
          delay: 0,
          special: null,
        };
        const sectionTypes = c.animations?.types || [];
        const mergedTypes = [...new Set([...sectionTypes, ...globalAnimationTypes])];

        return {
          ...c,
          id: c.id || crypto.randomUUID(),
          props: c.props || {},
          animations: {
            ...baseAnimations,
            types: mergedTypes,
          },
        };
      });

      currentStep = 'Assembling schema';
      const websiteSchema = buildSchema(theme, layout, validatedComponents);

      currentStep = 'Creating project';
      const projectTitle = projectName || 
        `${analysis.industry} — ${analysis.pageType} (${new Date().toLocaleDateString()})`;

      const project = await Project.create({
        userId,
        name: projectTitle,
        websiteSchema,
      });

      console.log(
        `[Worker] Job completed: pageType=${analysis.pageType}, sections=${validatedComponents.map((c) => c.type).join(',')}, effects=${globalAnimationTypes.join(',')}`
      );

      return { projectId: project._id.toString() };
    } catch (err) {
      console.error(`Generation error at [${currentStep}]:`, err.message);
      throw new Error(`Failed at: ${currentStep}. Error: ${err.message.slice(0, 200)}`);
    }
  },
  { connection }
);

worker.on('completed', (job, result) => {
  // Silent completion
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

export default worker;

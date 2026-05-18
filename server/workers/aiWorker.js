import { Worker } from 'bullmq';
import connection from '../config/redis.js';

import { searchWeb, extractSearchQueries, extractUsefulContent } from '../services/webSearchService.js';
import { analyzePrompt } from '../services/promptAnalyzer.js';
import { generateLayout } from '../services/layoutEngine.js';
import { generateTheme } from '../services/themeEngine.js';
import { generateComponents, getSectionAnimationTypes } from '../services/componentGenerator.js';
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
      await job.updateProgress({ step: 'layout', pct: 20, log: `🔍 Analyzed: ${analysis.pageType} page, industry: ${analysis.industry}, effects: ${analysis.animations?.types?.join(', ') || 'default'}` });

      currentStep = 'Searching web';
      const searchQueries = extractSearchQueries(analysis);
      const searchLog = { queries: [], results: [] };

      for (const query of searchQueries) {
        const results = await searchWeb(query, 3);
        searchLog.queries.push(query);
        searchLog.results.push(...results);
        await job.updateProgress({
          step: 'searching',
          pct: 15,
          log: `🔎 Searched: "${query}" — found ${results.length} source${results.length !== 1 ? 's' : ''}`,
          searchQuery: query,
          searchResults: results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet || 'No description available' })),
        });
      }

      const webInsights = extractUsefulContent(searchLog.results);
      await job.updateProgress({
        step: 'layout',
        pct: 20,
        log: `📡 Found ${webInsights.length} useful sources. Applying to generation...`,
        allSearchResults: searchLog.queries.map((q, i) => ({
          query: q,
          results: searchLog.results.slice(i * 3, i * 3 + 3).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet || 'No description available',
          })),
        })),
      });

      currentStep = 'Generating layout';
      const layout = await generateLayout(analysis);
      await job.updateProgress({ step: 'theme', pct: 40, log: `📐 Layout planned: ${layout.sections.map(s => s.type).join(' → ')}` });
      
      currentStep = 'Generating theme';
      const theme = await generateTheme(analysis);
      await job.updateProgress({ step: 'components', pct: 60, log: `🎨 Theme generated: ${theme.colors?.primary || 'custom'} palette, ${theme.fonts?.heading || 'default'} font` });

      currentStep = 'Building components';
      const components = await generateComponents(layout, analysis, webInsights);
      await job.updateProgress({ step: 'schema', pct: 80, log: `⚡ Components built: ${components.map(c => c.type).join(', ')}` });

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
        const mergedTypes = getSectionAnimationTypes(c.type, globalAnimationTypes);

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
      await job.updateProgress({ step: 'saving', pct: 95, log: `✅ Schema assembled, saving project...` });

      currentStep = 'Creating project';
      const projectTitle = projectName || 
        `${analysis.industry} — ${analysis.pageType} (${new Date().toLocaleDateString()})`;

      const project = await Project.create({
        userId,
        name: projectTitle,
        websiteSchema,
        generationLogs: job.progress?.logs || [],
        webSearchData: searchLog,
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

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { generate, regenerateSection, getJobStatus } from '../controllers/websiteController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

const userGenerationCounts = new Map();

const userRateLimiter = (req, res, next) => {
  const userId = req.user?.id;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 50;
  
  const userData = userGenerationCounts.get(userId) || { count: 0, resetAt: now + windowMs };
  
  if (now > userData.resetAt) {
    userData.count = 0;
    userData.resetAt = now + windowMs;
  }
  
  if (userData.count >= maxRequests) {
    return res.status(429).json({ 
      message: `Generation limit reached. Resets in ${Math.ceil((userData.resetAt - now) / 60000)} minutes.` 
    });
  }
  
  userData.count++;
  userGenerationCounts.set(userId, userData);
  next();
};

router.post('/generate', protect, userRateLimiter, generate);
router.post('/regenerate/:projectId/section', protect, regenerateSection);
router.get('/job/:jobId', protect, getJobStatus);

export default router;

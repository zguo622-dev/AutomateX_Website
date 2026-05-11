/**
 * Vercel Speed Insights Integration
 * This script initializes Vercel Speed Insights for tracking web vitals and performance metrics.
 */

import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
injectSpeedInsights({
  debug: false, // Set to true for debugging in development
});

/**
 * Feature Flags Configuration
 *
 * Toggle features on/off during development.
 * Set to `true` to enable, `false` to disable.
 */

const isDev = import.meta.env.DEV;

export const FEATURE_FLAGS = {
  // Dashboard Features
  aiInsights: true,
  aiSuggestions: true,
  trendActivity: false,

  // Analysis Features
  competitorAnalysis: true,
  deepAnalysis: true,
  daypartAnalysis: true,
  topTenAnalysis: true,
  positionAnalysis: true,

  // Analytics Features
  doubleBookingsTimeline: true,
  doubleBookingsHeatmap: true,
  doubleBookingsInsights: true,
  campaignPlanner: true,
  creativeAgeAnalyzer: true,

  // UI Features
  keyboardShortcuts: true,
  onboardingTour: false,
  advancedFilters: true,
  historyDelete: true,

  // Export Features
  excelExport: true,

  // Dev-only features (auto-enabled in dev mode)
  debugMode: isDev,
  mockData: false,
};

/**
 * Check if a feature is enabled
 * @param {keyof typeof FEATURE_FLAGS} featureName
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
  return FEATURE_FLAGS[featureName] ?? false;
}

/**
 * Hook for using feature flags in components
 */
export function useFeatureFlag(featureName) {
  return isFeatureEnabled(featureName);
}

export default FEATURE_FLAGS;

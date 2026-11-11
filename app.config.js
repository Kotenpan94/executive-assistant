// Extends app.json. EXPO_BASE_URL is set only by the GitHub Pages deploy
// (npm run deploy), so the site works under /executive-assistant while local
// dev keeps serving from the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});

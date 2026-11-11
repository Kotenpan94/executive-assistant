// Demo mode is for the public web build (see the deploy script in package.json).
// It shows the time controls outside dev builds and swaps real document
// reading for a sample syllabus, since there's no extraction server online.
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

/** Show the fake-time controls: always in dev, and in the public demo. */
export const SHOW_TIME_CONTROLS = __DEV__ || DEMO_MODE;

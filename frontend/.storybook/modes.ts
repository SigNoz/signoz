/**
 * Chromatic modes: one snapshot per entry, per story. The globals in a mode are
 * Storybook's own, so `theme` is the toolbar's theme and the story renders the
 * way it does locally. The width matches `scripts/story-shots.mjs` (`--width`),
 * so a cloud snapshot and a local shot frame the same page.
 */
export const allModes = {
	dark: { theme: 'dark', viewport: { width: 1680, height: 1200 } },
	light: { theme: 'light', viewport: { width: 1680, height: 1200 } },
} as const;

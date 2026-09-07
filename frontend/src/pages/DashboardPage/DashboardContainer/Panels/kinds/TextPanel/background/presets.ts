import type {
	PanelTheme,
	TextBackgroundPair,
	TextBackgroundPreset,
} from './types';

/** Swatch row order, after Transparent and Default panel. */
export const TEXT_BACKGROUND_PRESETS: readonly TextBackgroundPreset[] = [
	'robin',
	'purple',
	'sakura',
	'cherry',
	'amber',
	'forest',
	'sienna',
	'slate',
];

/**
 * The sixteen surfaces must stay distinct — `resolveTextBackground` recovers a
 * preset name from a stored hex — and every pair must clear 4.5:1. Both are
 * asserted in `__tests__/textBackground.test.ts`.
 */
export const TEXT_BACKGROUND_PAIRS: Record<
	TextBackgroundPreset,
	Record<PanelTheme, TextBackgroundPair>
> = {
	robin: {
		light: { surface: '#DCE4FF', ink: '#16224D' },
		dark: { surface: '#24356E', ink: '#EDF1FF' },
	},
	purple: {
		light: { surface: '#E8DEFB', ink: '#2B1B4D' },
		dark: { surface: '#3A2A63', ink: '#F1EAFE' },
	},
	sakura: {
		light: { surface: '#FBDCEB', ink: '#4A1730' },
		dark: { surface: '#5F2342', ink: '#FDE8F2' },
	},
	cherry: {
		light: { surface: '#FBDCDC', ink: '#4C1717' },
		dark: { surface: '#63262A', ink: '#FDE9E9' },
	},
	amber: {
		light: { surface: '#FBEECC', ink: '#45320A' },
		dark: { surface: '#5B4415', ink: '#FDF3DC' },
	},
	forest: {
		light: { surface: '#D6F2E2', ink: '#0F3A25' },
		dark: { surface: '#1D4A33', ink: '#E3F7EC' },
	},
	sienna: {
		light: { surface: '#F0E4D8', ink: '#40301F' },
		dark: { surface: '#56412C', ink: '#F5EADF' },
	},
	slate: {
		light: { surface: '#E4E6EA', ink: '#1D212D' },
		dark: { surface: '#2C3140', ink: '#EDEEF0' },
	},
};

/** How `kind: 'none'` survives a string-only schema. */
export const TRANSPARENT_BACKGROUND = '#00000000';

/** The theme's own overlay ink, so a note keeps the edge weight of its neighbours. */
export const PRESET_BORDER: Record<PanelTheme, string> = {
	light: 'rgba(0, 0, 0, 0.07)',
	dark: 'rgba(255, 255, 255, 0.09)',
};

export const SECONDARY_INK_OPACITY = 0.82;

/**
 * Surface chrome, as a share of the pair's ink. Each name falls back to its
 * original token in the stylesheet, so a panel with no background is untouched.
 * `--scrollbar-thumb*` are unscoped on purpose: they override the shared
 * scrollbar mixin, which any surface may want to retint.
 */
export const INK_ALPHAS: Record<string, number> = {
	'--text-panel-ink-secondary': SECONDARY_INK_OPACITY,
	'--text-panel-grip': 0.28,
	'--scrollbar-thumb': 0.24,
	'--scrollbar-thumb-hover': 0.4,
	'--text-panel-pill-surface': 0.16,
};

/** The two inks a custom surface picks between. */
export const CUSTOM_INK: Record<PanelTheme, string> = {
	light: '#FFFFFF',
	dark: '#1D212D',
};

/**
 * Normalised surface hex to the preset that owns it, both themes: a panel saved
 * in dark mode resolves to its preset in light mode, with no re-save.
 */
export const PRESET_BY_SURFACE: Record<string, TextBackgroundPreset> =
	Object.fromEntries(
		TEXT_BACKGROUND_PRESETS.flatMap((preset) => [
			[TEXT_BACKGROUND_PAIRS[preset].light.surface.toUpperCase(), preset],
			[TEXT_BACKGROUND_PAIRS[preset].dark.surface.toUpperCase(), preset],
		]),
	);

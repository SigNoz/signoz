import { inkForSurface, normalizeHex, parseHex } from './contrast';
import {
	PRESET_BY_SURFACE,
	TEXT_BACKGROUND_PAIRS,
	TRANSPARENT_BACKGROUND,
} from './presets';
import type {
	PanelTheme,
	ResolvedTextBackground,
	TextBackgroundPreset,
	TextBackgroundSelection,
} from './types';

/** `presentation.background` before it was a hex string; the API rejects both now. */
const LEGACY_VALUES: Record<string, ResolvedTextBackground['kind']> = {
	solid: 'default',
	transparent: 'none',
};

const DEFAULT_BACKGROUND: ResolvedTextBackground = { kind: 'default' };

/**
 * A stored preset surface resolves to its pair in the *current* theme, so a panel
 * follows a theme switch with no re-save; any other hex is a custom colour, which
 * does not adapt.
 */
export function resolveTextBackground(
	background: string | null | undefined,
	theme: PanelTheme,
): ResolvedTextBackground {
	if (!background) {
		return DEFAULT_BACKGROUND;
	}

	const legacy = LEGACY_VALUES[background];
	if (legacy) {
		return legacy === 'none' ? { kind: 'none' } : DEFAULT_BACKGROUND;
	}

	const channels = parseHex(background);
	if (!channels) {
		return DEFAULT_BACKGROUND;
	}
	if (channels.a === 0) {
		return { kind: 'none' };
	}

	const normalized = normalizeHex(background);
	const preset = normalized ? PRESET_BY_SURFACE[normalized] : undefined;
	if (preset) {
		return { kind: 'preset', preset, ...TEXT_BACKGROUND_PAIRS[preset][theme] };
	}

	return {
		kind: 'custom',
		surface: background,
		ink: inkForSurface(background),
	};
}

/** A preset stores the current theme's surface; `default` stores nothing. */
export function toStoredBackground(
	resolved: ResolvedTextBackground,
	theme: PanelTheme,
): string | undefined {
	switch (resolved.kind) {
		case 'none':
			return TRANSPARENT_BACKGROUND;
		case 'preset':
			return resolved.preset
				? TEXT_BACKGROUND_PAIRS[resolved.preset][theme].surface
				: undefined;
		case 'custom':
			return resolved.surface;
		default:
			return undefined;
	}
}

/** Which swatch lights up; `undefined` for a custom colour, which has no swatch. */
export function selectionFromResolved(
	resolved: ResolvedTextBackground,
): TextBackgroundSelection | undefined {
	if (resolved.kind === 'preset') {
		return resolved.preset;
	}
	return resolved.kind === 'custom' ? undefined : resolved.kind;
}

/** What a swatch click stores. */
export function storedFromSelection(
	selection: TextBackgroundSelection,
	theme: PanelTheme,
): string | undefined {
	if (selection === 'none' || selection === 'default') {
		return toStoredBackground({ kind: selection }, theme);
	}
	return toStoredBackground({ kind: 'preset', preset: selection }, theme);
}

/** The hex a swatch paints in the given theme. */
export function presetSurface(
	preset: TextBackgroundPreset,
	theme: PanelTheme,
): string {
	return TEXT_BACKGROUND_PAIRS[preset][theme].surface;
}

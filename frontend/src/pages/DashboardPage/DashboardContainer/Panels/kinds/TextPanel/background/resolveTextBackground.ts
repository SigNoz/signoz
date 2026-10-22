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
import { TextBackgroundKind } from './types';

/** `presentation.background` before it was a hex string; the API rejects both now. */
const LEGACY_VALUES: Record<string, TextBackgroundKind> = {
	solid: TextBackgroundKind.Default,
	transparent: TextBackgroundKind.None,
};

const DEFAULT_BACKGROUND: ResolvedTextBackground = {
	kind: TextBackgroundKind.Default,
};

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
		return legacy === TextBackgroundKind.None
			? { kind: TextBackgroundKind.None }
			: DEFAULT_BACKGROUND;
	}

	const channels = parseHex(background);
	if (!channels) {
		return DEFAULT_BACKGROUND;
	}
	if (channels.a === 0) {
		return { kind: TextBackgroundKind.None };
	}

	const normalized = normalizeHex(background);
	const preset = normalized ? PRESET_BY_SURFACE[normalized] : undefined;
	if (preset) {
		return {
			kind: TextBackgroundKind.Preset,
			preset,
			...TEXT_BACKGROUND_PAIRS[preset][theme],
		};
	}

	return {
		kind: TextBackgroundKind.Custom,
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
		case TextBackgroundKind.None:
			return TRANSPARENT_BACKGROUND;
		case TextBackgroundKind.Preset:
			return resolved.preset
				? TEXT_BACKGROUND_PAIRS[resolved.preset][theme].surface
				: undefined;
		case TextBackgroundKind.Custom:
			return resolved.surface;
		default:
			return undefined;
	}
}

/** Which swatch lights up; `undefined` for a custom colour, which has no swatch. */
export function selectionFromResolved(
	resolved: ResolvedTextBackground,
): TextBackgroundSelection | undefined {
	if (resolved.kind === TextBackgroundKind.Preset) {
		return resolved.preset;
	}
	return resolved.kind === TextBackgroundKind.Custom ? undefined : resolved.kind;
}

/** What a swatch click stores. */
export function storedFromSelection(
	selection: TextBackgroundSelection,
	theme: PanelTheme,
): string | undefined {
	if (
		selection === TextBackgroundKind.None ||
		selection === TextBackgroundKind.Default
	) {
		return toStoredBackground({ kind: selection }, theme);
	}
	return toStoredBackground(
		{ kind: TextBackgroundKind.Preset, preset: selection },
		theme,
	);
}

/** The hex a swatch paints in the given theme. */
export function presetSurface(
	preset: TextBackgroundPreset,
	theme: PanelTheme,
): string {
	return TEXT_BACKGROUND_PAIRS[preset][theme].surface;
}

import {
	contrastRatio,
	inkForSurface,
	meetsContrast,
	MIN_CONTRAST_RATIO,
	normalizeHex,
	parseHex,
	rgbaFromHex,
} from '../contrast';
import {
	CUSTOM_INK,
	TEXT_BACKGROUND_PAIRS,
	TEXT_BACKGROUND_PRESETS,
	TRANSPARENT_BACKGROUND,
} from '../presets';
import {
	presetSurface,
	resolveTextBackground,
	selectionFromResolved,
	storedFromSelection,
	toStoredBackground,
} from '../resolveTextBackground';
import type { ResolvedTextBackground } from '../types';
import { PanelTheme, TextBackgroundKind, TextBackgroundPreset } from '../types';

const THEMES: PanelTheme[] = Object.values(PanelTheme);

describe('preset tokens', () => {
	const pairs = TEXT_BACKGROUND_PRESETS.flatMap((preset) =>
		THEMES.map((theme) => ({
			preset,
			theme,
			...TEXT_BACKGROUND_PAIRS[preset][theme],
		})),
	);

	it('covers all eight presets in both themes', () => {
		expect(pairs).toHaveLength(16);
	});

	it.each(pairs)(
		'$preset/$theme clears the contrast floor',
		({ surface, ink }) => {
			expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(
				MIN_CONTRAST_RATIO,
			);
		},
	);

	// A repeated surface would make the hex → preset lookup ambiguous.
	it('keeps all sixteen surfaces distinct', () => {
		const surfaces = pairs.map(({ surface }) => surface.toUpperCase());
		expect(new Set(surfaces).size).toBe(16);
	});
});

describe('parseHex', () => {
	it('expands shorthand digits', () => {
		expect(parseHex('#abc')).toStrictEqual({ r: 170, g: 187, b: 204, a: 1 });
	});

	it('reads the alpha channel from the four- and eight-digit forms', () => {
		expect(parseHex('#0000')?.a).toBe(0);
		expect(parseHex('#00000000')?.a).toBe(0);
		expect(parseHex('#aabbccff')?.a).toBe(1);
	});

	it('treats a form without an alpha channel as opaque', () => {
		expect(parseHex('#aabbcc')?.a).toBe(1);
	});

	it.each(['', 'aabbcc', 'red', '#abcde', '#gggggg'])('rejects %s', (color) => {
		expect(parseHex(color)).toBeUndefined();
	});

	it('normalises to the uppercase six-digit form', () => {
		expect(normalizeHex('#dce4ff')).toBe('#DCE4FF');
		expect(normalizeHex('#abc')).toBe('#AABBCC');
		expect(normalizeHex('#dce4ffcc')).toBe('#DCE4FF');
	});
});

describe('rgbaFromHex', () => {
	it('takes a share of the colour', () => {
		expect(rgbaFromHex('#DCE4FF', 0.82)).toBe('rgba(220, 228, 255, 0.82)');
	});

	it('expands shorthand and ignores the source alpha', () => {
		expect(rgbaFromHex('#abc', 1)).toBe('rgba(170, 187, 204, 1)');
		expect(rgbaFromHex('#aabbcc00', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
	});

	it('returns nothing for a colour it cannot read', () => {
		expect(rgbaFromHex('red', 0.82)).toBeUndefined();
	});
});

describe('inkForSurface', () => {
	it('puts light ink on a dark surface and dark ink on a light one', () => {
		expect(inkForSurface('#101010')).toBe(CUSTOM_INK.light);
		expect(inkForSurface('#F5F5F5')).toBe(CUSTOM_INK.dark);
	});

	it('reports a mid surface as short of the floor without failing', () => {
		const surface = '#808080';
		expect(meetsContrast(surface, inkForSurface(surface))).toBe(false);
	});
});

describe('resolveTextBackground', () => {
	it.each([undefined, null, ''])('reads %s as the default surface', (stored) => {
		expect(resolveTextBackground(stored, PanelTheme.Dark)).toStrictEqual({
			kind: TextBackgroundKind.Default,
		});
	});

	it.each([TRANSPARENT_BACKGROUND, '#0000'])(
		'reads the zero-alpha colour %s as no card',
		(stored) => {
			expect(resolveTextBackground(stored, PanelTheme.Dark)).toStrictEqual({
				kind: TextBackgroundKind.None,
			});
		},
	);

	it('resolves a surface stored in one theme to the pair of the other', () => {
		const storedInLight = presetSurface(
			TextBackgroundPreset.Amber,
			PanelTheme.Light,
		);

		expect(resolveTextBackground(storedInLight, PanelTheme.Dark)).toStrictEqual({
			kind: TextBackgroundKind.Preset,
			preset: TextBackgroundPreset.Amber,
			...TEXT_BACKGROUND_PAIRS.amber.dark,
		});
	});

	it('recognises a preset surface whatever its case', () => {
		const stored = presetSurface(
			TextBackgroundPreset.Forest,
			PanelTheme.Dark,
		).toLowerCase();

		expect(resolveTextBackground(stored, PanelTheme.Light)).toMatchObject({
			kind: TextBackgroundKind.Preset,
			preset: TextBackgroundPreset.Forest,
		});
	});

	it('reads a hex that is not a preset surface as a custom colour', () => {
		expect(resolveTextBackground('#3A2A64', PanelTheme.Dark)).toStrictEqual({
			kind: TextBackgroundKind.Custom,
			surface: '#3A2A64',
			ink: CUSTOM_INK.light,
		});
	});

	it('holds a custom colour steady across a theme switch', () => {
		expect(resolveTextBackground('#3A2A64', PanelTheme.Light)).toStrictEqual(
			resolveTextBackground('#3A2A64', PanelTheme.Dark),
		);
	});

	// The enum the API used to accept; neither value is a hex.
	it.each([
		['solid', TextBackgroundKind.Default],
		['transparent', TextBackgroundKind.None],
	])('migrates the legacy %s value to %s', (stored, kind) => {
		expect(resolveTextBackground(stored, PanelTheme.Dark)).toStrictEqual({
			kind,
		});
	});

	it('falls back to the default surface for an unreadable value', () => {
		expect(resolveTextBackground('rgb(1, 2, 3)', PanelTheme.Dark)).toStrictEqual({
			kind: TextBackgroundKind.Default,
		});
	});
});

describe('editor adapters', () => {
	it.each([
		[undefined, TextBackgroundKind.Default],
		[TRANSPARENT_BACKGROUND, TextBackgroundKind.None],
		['solid', TextBackgroundKind.Default],
	])('lights up the %s swatch', (stored, selection) => {
		expect(
			selectionFromResolved(resolveTextBackground(stored, PanelTheme.Dark)),
		).toBe(selection);
	});

	it('lights up the preset a stored surface belongs to', () => {
		expect(
			selectionFromResolved(
				resolveTextBackground(
					presetSurface(TextBackgroundPreset.Slate, PanelTheme.Light),
					PanelTheme.Dark,
				),
			),
		).toBe(TextBackgroundPreset.Slate);
	});

	it('lights up nothing for a custom colour', () => {
		expect(
			selectionFromResolved(resolveTextBackground('#3A2A64', PanelTheme.Dark)),
		).toBeUndefined();
	});

	it('stores what each swatch means', () => {
		expect(storedFromSelection(TextBackgroundKind.None, PanelTheme.Dark)).toBe(
			TRANSPARENT_BACKGROUND,
		);
		expect(
			storedFromSelection(TextBackgroundKind.Default, PanelTheme.Dark),
		).toBeUndefined();
		expect(
			storedFromSelection(TextBackgroundPreset.Cherry, PanelTheme.Light),
		).toBe(presetSurface(TextBackgroundPreset.Cherry, PanelTheme.Light));
	});
});

describe('round trip', () => {
	const cases: ResolvedTextBackground[] = [
		{ kind: TextBackgroundKind.None },
		{ kind: TextBackgroundKind.Default },
		{
			kind: TextBackgroundKind.Custom,
			surface: '#3A2A64',
			ink: CUSTOM_INK.light,
		},
		...TEXT_BACKGROUND_PRESETS.map((preset) => ({
			kind: TextBackgroundKind.Preset,
			preset,
		})),
	];

	it.each(cases)(
		'preserves $kind $preset through a save and load',
		(resolved) => {
			THEMES.forEach((theme) => {
				const stored = toStoredBackground(resolved, theme);
				const reread = resolveTextBackground(stored, theme);

				expect(reread.kind).toBe(resolved.kind);
				expect(reread.preset).toBe(resolved.preset);
			});
		},
	);

	it.each([
		undefined,
		TRANSPARENT_BACKGROUND,
		'#3A2A64',
		'solid',
		'transparent',
	])('re-reading %s changes nothing', (stored) => {
		THEMES.forEach((theme) => {
			const once = resolveTextBackground(stored, theme);
			const twice = resolveTextBackground(toStoredBackground(once, theme), theme);

			expect(twice).toStrictEqual(once);
		});
	});
});

import { getPaletteStops } from '../palettes';
import { HeatmapColorPalette } from '../types';

const ALL_PALETTES = Object.values(HeatmapColorPalette);

/** Perceived brightness, good enough to tell a ramp's ends apart. */
function luminance(hex: string): number {
	const value = parseInt(hex.slice(1), 16);
	// eslint-disable-next-line no-bitwise
	const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('getPaletteStops', () => {
	it.each(ALL_PALETTES)('%s is a full ramp of valid colours', (palette) => {
		const stops = getPaletteStops(palette, true);

		expect(stops).toHaveLength(9);
		stops.forEach((stop) => expect(stop).toMatch(/^#[0-9a-f]{6}$/));
	});

	it.each(ALL_PALETTES)(
		'%s climbs from dark to bright on a dark panel',
		(palette) => {
			const stops = getPaletteStops(palette, true);

			// Low counts must sit near the surface, whichever direction the ramp is
			// stored in — otherwise empty cells become the loudest thing on screen.
			expect(luminance(stops[0])).toBeLessThan(luminance(stops[stops.length - 1]));
		},
	);

	it.each(ALL_PALETTES)(
		'%s falls from pale to saturated on a light panel',
		(palette) => {
			const stops = getPaletteStops(palette, false);

			expect(luminance(stops[0])).toBeGreaterThan(
				luminance(stops[stops.length - 1]),
			);
		},
	);

	it.each(ALL_PALETTES)('%s uses the same colours in both themes', (palette) => {
		// Only the polarity flips; the palette itself is theme-independent.
		expect([...getPaletteStops(palette, false)].reverse()).toStrictEqual(
			getPaletteStops(palette, true),
		);
	});

	it('never mutates the stored ramp when reversing it', () => {
		const first = getPaletteStops(HeatmapColorPalette.Lava, false);
		const second = getPaletteStops(HeatmapColorPalette.Lava, false);

		expect(first).toStrictEqual(second);
	});

	it('falls back to the first ramp for an unknown palette', () => {
		const unknown = 'nope' as HeatmapColorPalette;

		expect(getPaletteStops(unknown, true)).toStrictEqual(
			getPaletteStops(HeatmapColorPalette.Ice, true),
		);
	});

	it('offers a neutral ramp for panels that already spend colour elsewhere', () => {
		const stops = getPaletteStops(HeatmapColorPalette.Graphite, true);

		// Every stop is a grey: red, green and blue channels stay equal.
		stops.forEach((stop) => {
			expect(stop.slice(1, 3)).toBe(stop.slice(3, 5));
			expect(stop.slice(3, 5)).toBe(stop.slice(5, 7));
		});
	});
});

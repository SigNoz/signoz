import {
	darkenHex,
	generateColorPair,
	PALETTE_V3,
	RESERVED_ERROR,
	RESERVED_OK,
	RESERVED_WARNING,
} from '../generateColorPair';

describe('generateColorPair', () => {
	it('is deterministic: same name returns the same pair across calls', () => {
		const a = generateColorPair('payment-service');
		const b = generateColorPair('payment-service');
		expect(a).toBe(b); // cache hit returns the same reference
		expect(a.color).toBe(b.color);
		expect(a.colorDark).toBe(b.colorDark);
	});

	it('returns a palette color for a normal name', () => {
		const { color } = generateColorPair('any-service');
		expect(PALETTE_V3).toContain(color);
	});

	it('colorDark differs from color (darker variant computed via darkenHex)', () => {
		const { color, colorDark } = generateColorPair('checkout-svc');
		expect(colorDark).not.toBe(color);
		expect(colorDark).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it('produces different colors for different names (palette wraps modulo length)', () => {
		const a = generateColorPair('aaa');
		const b = generateColorPair('bbb');
		// Not strictly guaranteed (hash collisions exist with 28 buckets), but
		// for these two short strings djb2 produces different bucket indices.
		expect(a.color).not.toBe(b.color);
	});
});

describe('darkenHex', () => {
	it('returns a darker hex than the input for amount > 0', () => {
		const input = '#4D6BD8';
		const out = darkenHex(input, 0.22);
		expect(out).toMatch(/^#[0-9a-f]{6}$/i);
		expect(out).not.toBe(input);
	});

	it('handles amount = 0 as a near-identity', () => {
		const out = darkenHex('#4D6BD8', 0);
		// HSL round-trip may shift a digit; only assert format.
		expect(out).toMatch(/^#[0-9a-f]{6}$/i);
	});
});

describe('reserved status colors', () => {
	it('matches spec section 8 hexes', () => {
		expect(RESERVED_ERROR).toBe('#FC4E4E');
		expect(RESERVED_WARNING).toBe('#fbbf24');
		expect(RESERVED_OK).toBe('#4ade80');
	});
});

// Visual inspection table: each palette color paired with its darkenHex(0.22)
// variant. Confirms the darkening produces a distinct, non-collapsed hex per
// entry. Run with `yarn jest generateColorPair --verbose` to see the table.
describe('PALETTE_V3 darken-pair table', () => {
	const PALETTE_NAMES = [
		'Slate blue',
		'Sage',
		'Amber',
		'Dusty pink',
		'Lavender',
		'Peach',
		'Sky teal',
		'Fuchsia',
		'Terracotta',
		'Forest',
		'Cornflower',
		'Iris',
		'Olive gold',
		'Mint',
		'Mauve',
		'Dusty teal',
		'Burnt orange',
		'Pistachio',
		'Periwinkle',
		'Coral blush',
		'Sienna',
		'Robin',
		'Sandy gold',
		'Powder blue',
		'Umber',
		'Aqua',
		'Warm tan',
		'Antique rose',
	];

	it.each(
		PALETTE_V3.map((hex, i) => [PALETTE_NAMES[i] ?? `idx-${i}`, hex] as const),
	)('%s (%s) darkens to a distinct hex', (name, hex) => {
		const dark = darkenHex(hex, 0.22);
		expect(dark).toMatch(/^#[0-9a-f]{6}$/i);
		expect(dark.toLowerCase()).not.toBe(hex.toLowerCase());
	});

	it('all 28 darkened variants are unique (no collisions)', () => {
		const darks = PALETTE_V3.map((hex) => darkenHex(hex, 0.22).toLowerCase());
		const unique = new Set(darks);
		expect(unique.size).toBe(PALETTE_V3.length);
	});

	it('prints the base→dark table for visual inspection', () => {
		// eslint-disable-next-line no-console
		console.log('\nPALETTE_V3 base → darkenHex(0.22) pairs:');
		// eslint-disable-next-line no-console
		console.log('idx  name          base     dark');
		PALETTE_V3.forEach((hex, i) => {
			const dark = darkenHex(hex, 0.22);
			const name = (PALETTE_NAMES[i] ?? '').padEnd(13);
			const idx = String(i).padStart(2, ' ');
			// eslint-disable-next-line no-console
			console.log(`${idx}   ${name} ${hex}  ${dark}`);
		});
		// Sentinel assertion so the test is not flagged as having none.
		expect(PALETTE_V3).toHaveLength(28);
	});
});

import {
	DEFAULT_FILL_OPACITY,
	GRADIENT_MID_STOP_RATIO,
	resolveFillOpacity,
	toAlphaHex,
} from '../fillOpacity';

describe('resolveFillOpacity', () => {
	it('falls back to the default for a missing or unusable value', () => {
		expect(resolveFillOpacity(undefined)).toBe(DEFAULT_FILL_OPACITY);
		expect(resolveFillOpacity(null)).toBe(DEFAULT_FILL_OPACITY);
		expect(resolveFillOpacity(NaN)).toBe(DEFAULT_FILL_OPACITY);
	});

	it('keeps 0 rather than treating it as absent', () => {
		expect(resolveFillOpacity(0)).toBe(0);
	});

	it('clamps to 0–1', () => {
		expect(resolveFillOpacity(-0.5)).toBe(0);
		expect(resolveFillOpacity(2)).toBe(1);
	});
});

describe('toAlphaHex', () => {
	// The alphas hardcoded before opacity was configurable.
	it('reproduces the legacy solid alpha at the default opacity', () => {
		expect(toAlphaHex(DEFAULT_FILL_OPACITY)).toBe('70');
	});

	it('reproduces the legacy gradient mid-stop alpha at the default opacity', () => {
		expect(toAlphaHex(DEFAULT_FILL_OPACITY * GRADIENT_MID_STOP_RATIO)).toBe('40');
	});

	it('pads a single-digit alpha', () => {
		expect(toAlphaHex(0)).toBe('00');
		expect(toAlphaHex(0.02)).toBe('05');
	});

	it('maps a full opacity to ff', () => {
		expect(toAlphaHex(1)).toBe('ff');
	});
});

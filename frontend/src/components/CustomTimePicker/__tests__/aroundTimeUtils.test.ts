import {
	clampTimeComponent,
	isValidOffset,
	parseOffsetToMs,
} from '../aroundTimeUtils';

describe('parseOffsetToMs', () => {
	it('parses minutes correctly', () => {
		expect(parseOffsetToMs('5m')).toBe(5 * 60 * 1000);
		expect(parseOffsetToMs('15m')).toBe(15 * 60 * 1000);
		expect(parseOffsetToMs('30m')).toBe(30 * 60 * 1000);
	});

	it('parses hours correctly', () => {
		expect(parseOffsetToMs('1h')).toBe(60 * 60 * 1000);
		expect(parseOffsetToMs('3h')).toBe(3 * 60 * 60 * 1000);
	});

	it('parses days correctly', () => {
		expect(parseOffsetToMs('1d')).toBe(24 * 60 * 60 * 1000);
	});

	it('returns null for invalid formats', () => {
		expect(parseOffsetToMs('')).toBeNull();
		expect(parseOffsetToMs('invalid')).toBeNull();
		expect(parseOffsetToMs('1w')).toBeNull();
		expect(parseOffsetToMs('1')).toBeNull();
		expect(parseOffsetToMs('m')).toBeNull();
	});

	it('trims whitespace', () => {
		expect(parseOffsetToMs('  15m  ')).toBe(15 * 60 * 1000);
	});
});

describe('clampTimeComponent', () => {
	it('returns 00 for NaN input', () => {
		expect(clampTimeComponent('abc', 23)).toBe('00');
	});

	it('clamps to max', () => {
		expect(clampTimeComponent('99', 23)).toBe('23');
		expect(clampTimeComponent('99', 59)).toBe('59');
	});

	it('clamps to 0 for negatives', () => {
		expect(clampTimeComponent('-5', 23)).toBe('00');
	});

	it('pads single digit values', () => {
		expect(clampTimeComponent('5', 23)).toBe('05');
		expect(clampTimeComponent('0', 59)).toBe('00');
	});

	it('passes valid values through', () => {
		expect(clampTimeComponent('12', 23)).toBe('12');
		expect(clampTimeComponent('45', 59)).toBe('45');
	});
});

describe('isValidOffset', () => {
	it('returns true for valid offsets', () => {
		expect(isValidOffset('5m')).toBe(true);
		expect(isValidOffset('1h')).toBe(true);
		expect(isValidOffset('1d')).toBe(true);
	});

	it('returns false for invalid offsets', () => {
		expect(isValidOffset('')).toBe(false);
		expect(isValidOffset('1w')).toBe(false);
		expect(isValidOffset('abc')).toBe(false);
	});
});

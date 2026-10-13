import { parseFormattedValue } from '../parseFormattedValue';

describe('parseFormattedValue', () => {
	it('splits a trailing unit label off the numeric core', () => {
		expect(parseFormattedValue('295.43 ms')).toStrictEqual({
			numericValue: '295.43',
			prefixUnit: '',
			suffixUnit: 'ms',
		});
	});

	it('splits a leading currency symbol off the numeric core', () => {
		expect(parseFormattedValue('$ 1.2K')).toStrictEqual({
			numericValue: '1.2K',
			prefixUnit: '$',
			suffixUnit: '',
		});
	});

	// Regression: the numeric core used to reject `,`, so a grouped value fell
	// through to the whole-string fallback and lost its unit split.
	it('keeps the unit split for grouped values', () => {
		expect(parseFormattedValue('1,234,567 ms')).toStrictEqual({
			numericValue: '1,234,567',
			prefixUnit: '',
			suffixUnit: 'ms',
		});
		expect(parseFormattedValue('1,234,567%')).toStrictEqual({
			numericValue: '1,234,567',
			prefixUnit: '',
			suffixUnit: '%',
		});
		expect(parseFormattedValue('$ 1,234,567.89')).toStrictEqual({
			numericValue: '1,234,567.89',
			prefixUnit: '$',
			suffixUnit: '',
		});
	});

	it('treats a unitless value as the numeric core', () => {
		expect(parseFormattedValue('1,234,567')).toStrictEqual({
			numericValue: '1,234,567',
			prefixUnit: '',
			suffixUnit: '',
		});
	});

	it('falls back to the whole string when nothing matches', () => {
		expect(parseFormattedValue('∞')).toStrictEqual({
			numericValue: '∞',
			prefixUnit: '',
			suffixUnit: '',
		});
		expect(parseFormattedValue('NaN')).toStrictEqual({
			numericValue: 'NaN',
			prefixUnit: '',
			suffixUnit: '',
		});
	});
});

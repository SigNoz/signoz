import { groupThousands } from '../groupThousands';

describe('groupThousands', () => {
	it('groups the integer digits of a plain number', () => {
		expect(groupThousands('1234567')).toBe('1,234,567');
		expect(groupThousands('1000')).toBe('1,000');
		expect(groupThousands('1000000000000000000000')).toBe(
			'1,000,000,000,000,000,000,000',
		);
	});

	it('leaves values below a thousand alone', () => {
		expect(groupThousands('0')).toBe('0');
		expect(groupThousands('999')).toBe('999');
		expect(groupThousands('295.43')).toBe('295.43');
	});

	it('groups only the integer part', () => {
		expect(groupThousands('1234567.891')).toBe('1,234,567.891');
		expect(groupThousands('1234.0001234')).toBe('1,234.0001234');
	});

	it('keeps the sign outside the first group', () => {
		expect(groupThousands('-1234567')).toBe('-1,234,567');
		expect(groupThousands('-1234567.891')).toBe('-1,234,567.891');
	});

	it('preserves suffix and prefix unit decoration', () => {
		expect(groupThousands('1234567 ms')).toBe('1,234,567 ms');
		expect(groupThousands('1234567%')).toBe('1,234,567%');
		expect(groupThousands('$ 1234567')).toBe('$ 1,234,567');
	});

	it('leaves formatter-scaled values untouched', () => {
		expect(groupThousands('1.18 MiB')).toBe('1.18 MiB');
		expect(groupThousands('1.23 Mil')).toBe('1.23 Mil');
		expect(groupThousands('20.58 mins')).toBe('20.58 mins');
	});

	it('leaves exponent notation untouched', () => {
		expect(groupThousands('1.234567e+21')).toBe('1.234567e+21');
		expect(groupThousands('1234567e-8')).toBe('1234567e-8');
	});

	it('returns non-numeric output unchanged', () => {
		expect(groupThousands('∞')).toBe('∞');
		expect(groupThousands('-∞')).toBe('-∞');
		expect(groupThousands('NaN')).toBe('NaN');
		expect(groupThousands('')).toBe('');
	});

	it('is idempotent on already-grouped input', () => {
		expect(groupThousands(groupThousands('1234567'))).toBe('1,234,567');
	});
});

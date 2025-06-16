// Tests for formatDate utility
import { formatDate } from '../dateUtils';

const dateToFormat = '2025-06-10';

describe('formatDate', () => {
	test('formats date to default format (en-US)', () => {
		expect(formatDate(dateToFormat)).toBe('June 10, 2025');
	});

	test('formats date to en-GB locale', () => {
		expect(formatDate(dateToFormat, 'en-GB')).toBe('10 June 2025');
	});

	test('formats date with custom options', () => {
		const options = {
			year: '2-digit' as const,
			month: '2-digit' as const,
			day: '2-digit' as const,
		};
		expect(formatDate(dateToFormat, 'en-US', options)).toBe('06/10/25');
	});

	test('formats date with weekday', () => {
		const options = {
			weekday: 'long' as const,
			year: 'numeric' as const,
			month: 'long' as const,
			day: 'numeric' as const,
		};
		// The weekday for 2025-06-10 is Tuesday
		expect(formatDate(dateToFormat, 'en-US', options)).toBe(
			'Tuesday, June 10, 2025',
		);
	});

	test('handles invalid date string', () => {
		// Invalid date returns "Invalid Date" string in toLocaleDateString
		expect(formatDate('invalid-date')).toBe('Invalid Date');
	});
});

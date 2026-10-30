import {
	clampTimeComponent,
	isValidOffset,
	parseOffsetToMs,
	toCalendarDate,
	toZonedDateTime,
	isValidTime,
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

	it.each(['0m', '0h', '0d', '9007199254740991d', '9'.repeat(400) + 'm'])(
		'rejects zero and overflowing offsets: %s',
		(offset) => {
			expect(parseOffsetToMs(offset)).toBeNull();
		},
	);
});

describe('calendar timezone conversion', () => {
	it('represents the selected timezone day in the calendar', () => {
		const date = toCalendarDate(
			new Date('2025-01-16T01:00:00Z'),
			'America/Los_Angeles',
		);
		expect([date.getFullYear(), date.getMonth(), date.getDate()]).toStrictEqual([
			2025, 0, 15,
		]);
	});

	it.each([
		['America/Los_Angeles', '2025-01-15T20:30:45.000Z'],
		['Asia/Kolkata', '2025-01-15T07:00:45.000Z'],
		['UTC', '2025-01-15T12:30:45.000Z'],
	])('interprets the calendar day and time in %s', (timezone, expected) => {
		expect(
			toZonedDateTime(
				new Date(2025, 0, 15),
				{ hour: '12', minute: '30', second: '45' },
				timezone,
			).toISOString(),
		).toBe(expected);
	});

	it('uses the selected day offset when crossing daylight saving time', () => {
		expect(
			toZonedDateTime(
				new Date(2025, 2, 9),
				{ hour: '12', minute: '00', second: '00' },
				'America/Los_Angeles',
			).toISOString(),
		).toBe('2025-03-09T19:00:00.000Z');
	});
});

describe('isValidTime', () => {
	it.each([
		['', '00', '00'],
		['24', '00', '00'],
		['12', '60', '00'],
		['12', '00', '60'],
	])('rejects invalid time %s:%s:%s', (hour, minute, second) => {
		expect(isValidTime(hour, minute, second)).toBe(false);
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

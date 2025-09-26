/* eslint-disable sonarjs/no-duplicate-string */
import { getYAxisFormattedValue } from '../yAxisConfig';

describe('getYAxisFormattedValue - none', () => {
	test('large integers and decimals', () => {
		expect(getYAxisFormattedValue('250034', 'none')).toBe('250034');
		expect(getYAxisFormattedValue('250034897', 'none')).toBe('250034897');
		expect(getYAxisFormattedValue('250034897.02354', 'none')).toBe(
			'250034897.0235',
		);
		expect(getYAxisFormattedValue('9999999.9999', 'none')).toBe('9999999.999');
	});

	test('preserves leading zeros after decimal until first non-zero', () => {
		expect(getYAxisFormattedValue('1.0000234', 'none')).toBe('1.0000234');
		expect(getYAxisFormattedValue('0.00003', 'none')).toBe('0.00003');
	});

	test('trims to three significant decimals and removes trailing zeros', () => {
		expect(getYAxisFormattedValue('0.000000250034', 'none')).toBe('0.00000025');
		expect(getYAxisFormattedValue('0.00000025', 'none')).toBe('0.00000025');

		// Big precision, limiting the javascript precision (~16 digits)
		expect(getYAxisFormattedValue('1.0000000000000001', 'none')).toBe('1');
		expect(getYAxisFormattedValue('1.00555555559595876', 'none')).toBe('1.00555');

		expect(getYAxisFormattedValue('0.000000001', 'none')).toBe('0.000000001');
		expect(getYAxisFormattedValue('0.000000250000', 'none')).toBe('0.00000025');
	});

	test('whole numbers normalize', () => {
		expect(getYAxisFormattedValue('1000', 'none')).toBe('1000');
		expect(getYAxisFormattedValue('99.5458', 'none')).toBe('99.545');
		expect(getYAxisFormattedValue('1.234567', 'none')).toBe('1.234');
		expect(getYAxisFormattedValue('99.998', 'none')).toBe('99.998');
	});

	test('strip redundant decimal zeros', () => {
		expect(getYAxisFormattedValue('1000.000', 'none')).toBe('1000');
		expect(getYAxisFormattedValue('99.500', 'none')).toBe('99.5');
		expect(getYAxisFormattedValue('1.000', 'none')).toBe('1');
	});

	test('edge values', () => {
		expect(getYAxisFormattedValue('0', 'none')).toBe('0');
		expect(getYAxisFormattedValue('-0', 'none')).toBe('0');
		expect(getYAxisFormattedValue('Infinity', 'none')).toBe('∞');
		expect(getYAxisFormattedValue('-Infinity', 'none')).toBe('-∞');
		expect(getYAxisFormattedValue('invalid', 'none')).toBe('NaN');
		expect(getYAxisFormattedValue('', 'none')).toBe('NaN');
		expect(getYAxisFormattedValue('abc123', 'none')).toBe('NaN');
	});

	test('small decimals keep precision as-is', () => {
		expect(getYAxisFormattedValue('0.0001', 'none')).toBe('0.0001');
		expect(getYAxisFormattedValue('-0.0001', 'none')).toBe('-0.0001');
		expect(getYAxisFormattedValue('0.000000001', 'none')).toBe('0.000000001');
	});

	test('simple decimals preserved', () => {
		expect(getYAxisFormattedValue('0.1', 'none')).toBe('0.1');
		expect(getYAxisFormattedValue('0.2', 'none')).toBe('0.2');
		expect(getYAxisFormattedValue('0.3', 'none')).toBe('0.3');
		expect(getYAxisFormattedValue('1.0000000001', 'none')).toBe('1.0000000001');
	});
});

describe('getYAxisFormattedValue - units', () => {
	test('ms', () => {
		expect(getYAxisFormattedValue('1500', 'ms')).toBe('1.5 s');
		expect(getYAxisFormattedValue('500', 'ms')).toBe('500 ms');
		expect(getYAxisFormattedValue('60000', 'ms')).toBe('1 min');
		expect(getYAxisFormattedValue('295.429', 'ms')).toBe('295.429 ms');
		expect(getYAxisFormattedValue('4353.81', 'ms')).toBe('4.354 s');
	});

	test('s', () => {
		expect(getYAxisFormattedValue('90', 's')).toBe('1.5 mins');
		expect(getYAxisFormattedValue('30', 's')).toBe('30 s');
		expect(getYAxisFormattedValue('3600', 's')).toBe('1 hour');
	});

	test('m', () => {
		expect(getYAxisFormattedValue('90', 'm')).toBe('1.5 hours');
		expect(getYAxisFormattedValue('30', 'm')).toBe('30 min');
		expect(getYAxisFormattedValue('1440', 'm')).toBe('1 day');
	});

	test('bytes', () => {
		expect(getYAxisFormattedValue('1024', 'bytes')).toBe('1 KiB');
		expect(getYAxisFormattedValue('512', 'bytes')).toBe('512 B');
		expect(getYAxisFormattedValue('1536', 'bytes')).toBe('1.5 KiB');
	});

	test('mbytes', () => {
		expect(getYAxisFormattedValue('1024', 'mbytes')).toBe('1 GiB');
		expect(getYAxisFormattedValue('512', 'mbytes')).toBe('512 MiB');
		expect(getYAxisFormattedValue('1536', 'mbytes')).toBe('1.5 GiB');
	});

	test('kbytes', () => {
		expect(getYAxisFormattedValue('1024', 'kbytes')).toBe('1 MiB');
		expect(getYAxisFormattedValue('512', 'kbytes')).toBe('512 KiB');
		expect(getYAxisFormattedValue('1536', 'kbytes')).toBe('1.5 MiB');
	});

	test('short', () => {
		expect(getYAxisFormattedValue('1000', 'short')).toBe('1 K');
		expect(getYAxisFormattedValue('1500', 'short')).toBe('1.5 K');
		expect(getYAxisFormattedValue('999', 'short')).toBe('999');

		expect(getYAxisFormattedValue('1000000', 'short')).toBe('1 Mil');
		expect(getYAxisFormattedValue('1555600', 'short')).toBe('1.556 Mil');
		expect(getYAxisFormattedValue('999999', 'short')).toBe('999.999 K');

		expect(getYAxisFormattedValue('1000000000', 'short')).toBe('1 Bil');
		expect(getYAxisFormattedValue('1500000000', 'short')).toBe('1.5 Bil');
		expect(getYAxisFormattedValue('999999999', 'short')).toBe('1000 Mil');
	});

	test('percent', () => {
		expect(getYAxisFormattedValue('0.15', 'percent')).toBe('0.15%');
		expect(getYAxisFormattedValue('0.1234', 'percent')).toBe('0.123%');
		expect(getYAxisFormattedValue('0.123499', 'percent')).toBe('0.123%');
		expect(getYAxisFormattedValue('1.5', 'percent')).toBe('1.5%');
		expect(getYAxisFormattedValue('0.0001', 'percent')).toBe('0.0001%');
		expect(getYAxisFormattedValue('0.000000001', 'percent')).toBe('1e-9%');
		expect(getYAxisFormattedValue('0.000000250034', 'percent')).toBe(
			'0.00000025%',
		);
		expect(getYAxisFormattedValue('0.00000025', 'percent')).toBe('0.00000025%');
		// Big precision, limiting the javascript precision (~16 digits)
		expect(getYAxisFormattedValue('1.0000000000000001', 'percent')).toBe('1%');
		expect(getYAxisFormattedValue('1.00555555559595876', 'percent')).toBe(
			'1.00555%',
		);
	});

	test('ratio', () => {
		expect(getYAxisFormattedValue('0.5', 'ratio')).toBe('0.5 ratio');
		expect(getYAxisFormattedValue('1.25', 'ratio')).toBe('1.25 ratio');
		expect(getYAxisFormattedValue('2.0', 'ratio')).toBe('2 ratio');
	});

	test('temperature units', () => {
		expect(getYAxisFormattedValue('25', 'celsius')).toBe('25 °C');
		expect(getYAxisFormattedValue('0', 'celsius')).toBe('0 °C');
		expect(getYAxisFormattedValue('-10', 'celsius')).toBe('-10 °C');

		expect(getYAxisFormattedValue('77', 'fahrenheit')).toBe('77 °F');
		expect(getYAxisFormattedValue('32', 'fahrenheit')).toBe('32 °F');
		expect(getYAxisFormattedValue('14', 'fahrenheit')).toBe('14 °F');
	});
});

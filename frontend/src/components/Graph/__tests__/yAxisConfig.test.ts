/* eslint-disable sonarjs/no-duplicate-string */
import { getYAxisFormattedValue, PrecisionOptionsEnum } from '../yAxisConfig';

const testFullPrecisionGetYAxisFormattedValue = (
	value: string,
	format: string,
): string => getYAxisFormattedValue(value, format, PrecisionOptionsEnum.FULL);

describe('getYAxisFormattedValue - none (full precision legacy assertions)', () => {
	test('large integers and decimals', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('250034', 'none')).toBe(
			'250034',
		);
		expect(
			testFullPrecisionGetYAxisFormattedValue('250034897.12345', 'none'),
		).toBe('250034897.12345');
		expect(
			testFullPrecisionGetYAxisFormattedValue('250034897.02354', 'none'),
		).toBe('250034897.02354');
		expect(testFullPrecisionGetYAxisFormattedValue('9999999.9999', 'none')).toBe(
			'9999999.9999',
		);
	});

	test('preserves leading zeros after decimal until first non-zero', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1.0000234', 'none')).toBe(
			'1.0000234',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('0.00003', 'none')).toBe(
			'0.00003',
		);
	});

	test('trims to three significant decimals and removes trailing zeros', () => {
		expect(
			testFullPrecisionGetYAxisFormattedValue('0.000000250034', 'none'),
		).toBe('0.000000250034');
		expect(testFullPrecisionGetYAxisFormattedValue('0.00000025', 'none')).toBe(
			'0.00000025',
		);

		// Big precision, limiting the javascript precision (~16 digits)
		expect(
			testFullPrecisionGetYAxisFormattedValue('1.0000000000000001', 'none'),
		).toBe('1');
		expect(
			testFullPrecisionGetYAxisFormattedValue('1.00555555559595876', 'none'),
		).toBe('1.005555555595958');

		expect(testFullPrecisionGetYAxisFormattedValue('0.000000001', 'none')).toBe(
			'0.000000001',
		);
		expect(
			testFullPrecisionGetYAxisFormattedValue('0.000000250000', 'none'),
		).toBe('0.00000025');
	});

	test('whole numbers normalize', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1000', 'none')).toBe('1000');
		expect(testFullPrecisionGetYAxisFormattedValue('99.5458', 'none')).toBe(
			'99.5458',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1.234567', 'none')).toBe(
			'1.234567',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('99.998', 'none')).toBe(
			'99.998',
		);
	});

	test('strip redundant decimal zeros', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1000.000', 'none')).toBe(
			'1000',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('99.500', 'none')).toBe(
			'99.5',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1.000', 'none')).toBe('1');
	});

	test('edge values', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0', 'none')).toBe('0');
		expect(testFullPrecisionGetYAxisFormattedValue('-0', 'none')).toBe('0');
		expect(testFullPrecisionGetYAxisFormattedValue('Infinity', 'none')).toBe('∞');
		expect(testFullPrecisionGetYAxisFormattedValue('-Infinity', 'none')).toBe(
			'-∞',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('invalid', 'none')).toBe(
			'NaN',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('', 'none')).toBe('NaN');
		expect(testFullPrecisionGetYAxisFormattedValue('abc123', 'none')).toBe('NaN');
	});

	test('small decimals keep precision as-is', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0.0001', 'none')).toBe(
			'0.0001',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('-0.0001', 'none')).toBe(
			'-0.0001',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('0.000000001', 'none')).toBe(
			'0.000000001',
		);
	});

	test('simple decimals preserved', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0.1', 'none')).toBe('0.1');
		expect(testFullPrecisionGetYAxisFormattedValue('0.2', 'none')).toBe('0.2');
		expect(testFullPrecisionGetYAxisFormattedValue('0.3', 'none')).toBe('0.3');
		expect(testFullPrecisionGetYAxisFormattedValue('1.0000000001', 'none')).toBe(
			'1.0000000001',
		);
	});
});

describe('getYAxisFormattedValue - units (full precision legacy assertions)', () => {
	test('ms', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1500', 'ms')).toBe('1.5 s');
		expect(testFullPrecisionGetYAxisFormattedValue('500', 'ms')).toBe('500 ms');
		expect(testFullPrecisionGetYAxisFormattedValue('60000', 'ms')).toBe('1 min');
		expect(testFullPrecisionGetYAxisFormattedValue('295.429', 'ms')).toBe(
			'295.429 ms',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('4353.81', 'ms')).toBe(
			'4.35381 s',
		);
	});

	test('s', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('90', 's')).toBe('1.5 mins');
		expect(testFullPrecisionGetYAxisFormattedValue('30', 's')).toBe('30 s');
		expect(testFullPrecisionGetYAxisFormattedValue('3600', 's')).toBe('1 hour');
	});

	test('m', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('90', 'm')).toBe('1.5 hours');
		expect(testFullPrecisionGetYAxisFormattedValue('30', 'm')).toBe('30 min');
		expect(testFullPrecisionGetYAxisFormattedValue('1440', 'm')).toBe('1 day');
	});

	test('bytes', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1024', 'bytes')).toBe(
			'1 KiB',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('512', 'bytes')).toBe('512 B');
		expect(testFullPrecisionGetYAxisFormattedValue('1536', 'bytes')).toBe(
			'1.5 KiB',
		);
	});

	test('mbytes', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1024', 'mbytes')).toBe(
			'1 GiB',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('512', 'mbytes')).toBe(
			'512 MiB',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1536', 'mbytes')).toBe(
			'1.5 GiB',
		);
	});

	test('kbytes', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1024', 'kbytes')).toBe(
			'1 MiB',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('512', 'kbytes')).toBe(
			'512 KiB',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1536', 'kbytes')).toBe(
			'1.5 MiB',
		);
	});

	test('short', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('1000', 'short')).toBe('1 K');
		expect(testFullPrecisionGetYAxisFormattedValue('1500', 'short')).toBe(
			'1.5 K',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('999', 'short')).toBe('999');

		expect(testFullPrecisionGetYAxisFormattedValue('1000000', 'short')).toBe(
			'1 Mil',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1555600', 'short')).toBe(
			'1.5556 Mil',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('999999', 'short')).toBe(
			'999.999 K',
		);

		expect(testFullPrecisionGetYAxisFormattedValue('1000000000', 'short')).toBe(
			'1 Bil',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1500000000', 'short')).toBe(
			'1.5 Bil',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('999999999', 'short')).toBe(
			'999.999999 Mil',
		);
	});

	test('percent', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0.15', 'percent')).toBe(
			'0.15%',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('0.1234', 'percent')).toBe(
			'0.1234%',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('0.123499', 'percent')).toBe(
			'0.123499%',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1.5', 'percent')).toBe(
			'1.5%',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('0.0001', 'percent')).toBe(
			'0.0001%',
		);
		expect(
			testFullPrecisionGetYAxisFormattedValue('0.000000001', 'percent'),
		).toBe('1e-9%');
		expect(
			testFullPrecisionGetYAxisFormattedValue('0.000000250034', 'percent'),
		).toBe('0.000000250034%');
		expect(testFullPrecisionGetYAxisFormattedValue('0.00000025', 'percent')).toBe(
			'0.00000025%',
		);
		// Big precision, limiting the javascript precision (~16 digits)
		expect(
			testFullPrecisionGetYAxisFormattedValue('1.0000000000000001', 'percent'),
		).toBe('1%');
		expect(
			testFullPrecisionGetYAxisFormattedValue('1.00555555559595876', 'percent'),
		).toBe('1.005555555595959%');
	});

	test('ratio', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0.5', 'ratio')).toBe(
			'0.5 ratio',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('1.25', 'ratio')).toBe(
			'1.25 ratio',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('2.0', 'ratio')).toBe(
			'2 ratio',
		);
	});

	test('temperature units', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('25', 'celsius')).toBe(
			'25 °C',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('0', 'celsius')).toBe('0 °C');
		expect(testFullPrecisionGetYAxisFormattedValue('-10', 'celsius')).toBe(
			'-10 °C',
		);

		expect(testFullPrecisionGetYAxisFormattedValue('77', 'fahrenheit')).toBe(
			'77 °F',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('32', 'fahrenheit')).toBe(
			'32 °F',
		);
		expect(testFullPrecisionGetYAxisFormattedValue('14', 'fahrenheit')).toBe(
			'14 °F',
		);
	});

	test('ms edge cases', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0', 'ms')).toBe('0 ms');
		expect(testFullPrecisionGetYAxisFormattedValue('-1500', 'ms')).toBe('-1.5 s');
		expect(testFullPrecisionGetYAxisFormattedValue('Infinity', 'ms')).toBe('∞');
	});

	test('bytes edge cases', () => {
		expect(testFullPrecisionGetYAxisFormattedValue('0', 'bytes')).toBe('0 B');
		expect(testFullPrecisionGetYAxisFormattedValue('-1024', 'bytes')).toBe(
			'-1 KiB',
		);
	});
});

describe('getYAxisFormattedValue - precision option tests', () => {
	test('precision 0 drops decimal part', () => {
		expect(getYAxisFormattedValue('1.2345', 'none', 0)).toBe('1');
		expect(getYAxisFormattedValue('0.9999', 'none', 0)).toBe('0');
		expect(getYAxisFormattedValue('12345.6789', 'none', 0)).toBe('12345');
		expect(getYAxisFormattedValue('0.0000123456', 'none', 0)).toBe('0');
		expect(getYAxisFormattedValue('1000.000', 'none', 0)).toBe('1000');
		expect(getYAxisFormattedValue('0.000000250034', 'none', 0)).toBe('0');
		expect(getYAxisFormattedValue('1.00555555559595876', 'none', 0)).toBe('1');

		// with unit
		expect(getYAxisFormattedValue('4353.81', 'ms', 0)).toBe('4 s');
	});
	test('precision 1,2,3,4 decimals', () => {
		expect(getYAxisFormattedValue('1.2345', 'none', 1)).toBe('1.2');
		expect(getYAxisFormattedValue('1.2345', 'none', 2)).toBe('1.23');
		expect(getYAxisFormattedValue('1.2345', 'none', 3)).toBe('1.234');
		expect(getYAxisFormattedValue('1.2345', 'none', 4)).toBe('1.2345');

		expect(getYAxisFormattedValue('0.0000123456', 'none', 1)).toBe('0.00001');
		expect(getYAxisFormattedValue('0.0000123456', 'none', 2)).toBe('0.000012');
		expect(getYAxisFormattedValue('0.0000123456', 'none', 3)).toBe('0.0000123');
		expect(getYAxisFormattedValue('0.0000123456', 'none', 4)).toBe('0.00001234');

		expect(getYAxisFormattedValue('1000.000', 'none', 1)).toBe('1000');
		expect(getYAxisFormattedValue('1000.000', 'none', 2)).toBe('1000');
		expect(getYAxisFormattedValue('1000.000', 'none', 3)).toBe('1000');
		expect(getYAxisFormattedValue('1000.000', 'none', 4)).toBe('1000');

		expect(getYAxisFormattedValue('0.000000250034', 'none', 1)).toBe('0.0000002');
		expect(getYAxisFormattedValue('0.000000250034', 'none', 2)).toBe(
			'0.00000025',
		); // leading zeros + 2 significant => same trimmed
		expect(getYAxisFormattedValue('0.000000250034', 'none', 3)).toBe(
			'0.00000025',
		);
		expect(getYAxisFormattedValue('0.000000250304', 'none', 4)).toBe(
			'0.0000002503',
		);

		expect(getYAxisFormattedValue('1.00555555559595876', 'none', 1)).toBe(
			'1.005',
		);
		expect(getYAxisFormattedValue('1.00555555559595876', 'none', 2)).toBe(
			'1.0055',
		);
		expect(getYAxisFormattedValue('1.00555555559595876', 'none', 3)).toBe(
			'1.00555',
		);
		expect(getYAxisFormattedValue('1.00555555559595876', 'none', 4)).toBe(
			'1.005555',
		);

		// with unit
		expect(getYAxisFormattedValue('4353.81', 'ms', 1)).toBe('4.4 s');
		expect(getYAxisFormattedValue('4353.81', 'ms', 2)).toBe('4.35 s');
		expect(getYAxisFormattedValue('4353.81', 'ms', 3)).toBe('4.354 s');
		expect(getYAxisFormattedValue('4353.81', 'ms', 4)).toBe('4.3538 s');

		// Percentages
		expect(getYAxisFormattedValue('0.123456', 'percent', 2)).toBe('0.12%');
		expect(getYAxisFormattedValue('0.123456', 'percent', 4)).toBe('0.1235%'); // approximation
	});

	test('precision full uses up to DEFAULT_SIGNIFICANT_DIGITS significant digits', () => {
		expect(
			getYAxisFormattedValue(
				'0.00002625429914148441',
				'none',
				PrecisionOptionsEnum.FULL,
			),
		).toBe('0.000026254299141');
		expect(
			getYAxisFormattedValue(
				'0.000026254299141484417',
				's',
				PrecisionOptionsEnum.FULL,
			),
		).toBe('26.254299141484417 µs');

		expect(
			getYAxisFormattedValue('4353.81', 'ms', PrecisionOptionsEnum.FULL),
		).toBe('4.35381 s');
		expect(getYAxisFormattedValue('500', 'ms', PrecisionOptionsEnum.FULL)).toBe(
			'500 ms',
		);
	});
});

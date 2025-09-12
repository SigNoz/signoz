import { getYAxisFormattedValue } from '../yAxisConfig';

describe('getYAxisFormattedValue', () => {
	describe('Basic formatting and precision', () => {
		it('should format numbers with intelligent precision', () => {
			expect(getYAxisFormattedValue('1000', 'none')).toBe('1000');
			expect(getYAxisFormattedValue('99.5458', 'none')).toBe('99.546');
			expect(getYAxisFormattedValue('1.234567', 'none')).toBe('1.235');
			expect(getYAxisFormattedValue('99.998', 'none')).toBe('99.998');
		});

		it('should remove unnecessary trailing zeros', () => {
			expect(getYAxisFormattedValue('1000.000', 'none')).toBe('1000');
			expect(getYAxisFormattedValue('99.500', 'none')).toBe('99.5');
			expect(getYAxisFormattedValue('1.000', 'none')).toBe('1');
		});
	});

	describe('Time unit conversions', () => {
		it('should handle milliseconds to seconds conversion', () => {
			expect(getYAxisFormattedValue('1500', 'ms')).toBe('1.5 s');
			expect(getYAxisFormattedValue('500', 'ms')).toBe('500 ms');
			expect(getYAxisFormattedValue('60000', 'ms')).toBe('1 min');
		});

		it('should handle seconds to minutes conversion', () => {
			expect(getYAxisFormattedValue('90', 's')).toBe('1.5 mins');
			expect(getYAxisFormattedValue('30', 's')).toBe('30 s');
			expect(getYAxisFormattedValue('3600', 's')).toBe('1 hour');
		});

		it('should handle minutes to hours conversion', () => {
			expect(getYAxisFormattedValue('90', 'm')).toBe('1.5 hours');
			expect(getYAxisFormattedValue('30', 'm')).toBe('30 min');
			expect(getYAxisFormattedValue('1440', 'm')).toBe('1 day');
		});
	});

	describe('Data size unit conversions', () => {
		it('should handle bytes to kilobytes conversion', () => {
			expect(getYAxisFormattedValue('1024', 'bytes')).toBe('1 KiB');
			expect(getYAxisFormattedValue('512', 'bytes')).toBe('512 B');
			expect(getYAxisFormattedValue('1536', 'bytes')).toBe('1.5 KiB');
		});

		it('should handle kilobytes to megabytes conversion', () => {
			expect(getYAxisFormattedValue('1024', 'kbytes')).toBe('1 MiB');
			expect(getYAxisFormattedValue('512', 'kbytes')).toBe('512 KiB');
			expect(getYAxisFormattedValue('1536', 'kbytes')).toBe('1.5 MiB');
		});

		it('should handle megabytes to gigabytes conversion', () => {
			expect(getYAxisFormattedValue('1024', 'mbytes')).toBe('1 GiB');
			expect(getYAxisFormattedValue('512', 'mbytes')).toBe('512 MiB');
			expect(getYAxisFormattedValue('1536', 'mbytes')).toBe('1.5 GiB');
		});
	});

	describe('Number scaling with short format', () => {
		it('should handle thousands scaling', () => {
			expect(getYAxisFormattedValue('1000', 'short')).toBe('1 K');
			expect(getYAxisFormattedValue('1500', 'short')).toBe('1.5 K');
			expect(getYAxisFormattedValue('999', 'short')).toBe('999');
		});

		it('should handle millions scaling', () => {
			expect(getYAxisFormattedValue('1000000', 'short')).toBe('1 Mil');
			expect(getYAxisFormattedValue('1500000', 'short')).toBe('1.5 Mil');
			expect(getYAxisFormattedValue('999999', 'short')).toBe('999.999 K');
		});

		it('should handle billions scaling', () => {
			expect(getYAxisFormattedValue('1000000000', 'short')).toBe('1 Bil');
			expect(getYAxisFormattedValue('1500000000', 'short')).toBe('1.5 Bil');
			expect(getYAxisFormattedValue('999999999', 'short')).toBe('1000 Mil');
		});
	});

	describe('Percentage and ratio formats', () => {
		it('should handle percentage conversion', () => {
			expect(getYAxisFormattedValue('0.15', 'percent')).toBe('0.15%');
			expect(getYAxisFormattedValue('0.1234', 'percent')).toBe('0.123%');
			expect(getYAxisFormattedValue('1.5', 'percent')).toBe('1.5%');
		});

		it('should handle ratio formats', () => {
			expect(getYAxisFormattedValue('0.5', 'ratio')).toBe('0.5 ratio');
			expect(getYAxisFormattedValue('1.25', 'ratio')).toBe('1.25 ratio');
			expect(getYAxisFormattedValue('2.0', 'ratio')).toBe('2 ratio');
		});
	});

	describe('Temperature unit conversions', () => {
		it('should handle celsius conversion', () => {
			expect(getYAxisFormattedValue('25', 'celsius')).toBe('25 °C');
			expect(getYAxisFormattedValue('0', 'celsius')).toBe('0 °C');
			expect(getYAxisFormattedValue('-10', 'celsius')).toBe('-10 °C');
		});

		it('should handle fahrenheit conversion', () => {
			expect(getYAxisFormattedValue('77', 'fahrenheit')).toBe('77 °F');
			expect(getYAxisFormattedValue('32', 'fahrenheit')).toBe('32 °F');
			expect(getYAxisFormattedValue('14', 'fahrenheit')).toBe('14 °F');
		});
	});

	describe('Edge cases and error handling', () => {
		it('should handle zero and special values', () => {
			expect(getYAxisFormattedValue('0', 'none')).toBe('0');
			expect(getYAxisFormattedValue('-0', 'none')).toBe('0');
			expect(getYAxisFormattedValue('Infinity', 'none')).toBe('∞');
			expect(getYAxisFormattedValue('-Infinity', 'none')).toBe('-∞');
		});

		it('should handle invalid inputs gracefully', () => {
			expect(getYAxisFormattedValue('invalid', 'none')).toBe('NaN');
			expect(getYAxisFormattedValue('', 'none')).toBe('NaN');
			expect(getYAxisFormattedValue('abc123', 'none')).toBe('NaN');
		});

		it('should handle very small numbers', () => {
			expect(getYAxisFormattedValue('0.0001', 'none')).toBe('0');
			expect(getYAxisFormattedValue('-0.0001', 'none')).toBe('0');
			expect(getYAxisFormattedValue('0.000000001', 'none')).toBe('0');
		});

		it('should handle floating point precision issues', () => {
			expect(getYAxisFormattedValue('0.1', 'none')).toBe('0.1');
			expect(getYAxisFormattedValue('0.2', 'none')).toBe('0.2');
			expect(getYAxisFormattedValue('0.3', 'none')).toBe('0.3');
			expect(getYAxisFormattedValue('1.0000000000000001', 'none')).toBe('1');
		});
	});
});

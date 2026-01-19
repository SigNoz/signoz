import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { convertValue, getFormattedUnit } from 'lib/getConvertedValue';

describe('getFormattedUnit', () => {
	it('should return the grafana unit for universal unit if it exists', () => {
		const formattedUnit = getFormattedUnit(UniversalYAxisUnit.KILOBYTES);
		expect(formattedUnit).toBe('deckbytes');
	});

	it('should return the unit directly if it is not a universal unit', () => {
		const formattedUnit = getFormattedUnit('{reason}');
		expect(formattedUnit).toBe('{reason}');
	});

	it('should return the universal unit directly if it does not have a grafana equivalent', () => {
		const formattedUnit = getFormattedUnit(UniversalYAxisUnit.EXABYTES);
		expect(formattedUnit).toBe(UniversalYAxisUnit.EXABYTES);
	});
});

describe('convertValue', () => {
	describe('data', () => {
		it('should convert bytes (IEC) to kilobytes', () => {
			expect(
				convertValue(
					1000,
					UniversalYAxisUnit.BYTES_IEC,
					UniversalYAxisUnit.KILOBYTES,
				),
			).toBe(1);
		});

		it('should convert bytes (SI) to kilobytes', () => {
			expect(
				convertValue(1000, UniversalYAxisUnit.BYTES, UniversalYAxisUnit.KILOBYTES),
			).toBe(1);
		});

		it('should convert kilobytes to bytes', () => {
			expect(
				convertValue(1, UniversalYAxisUnit.KILOBYTES, UniversalYAxisUnit.BYTES),
			).toBe(1000);
		});

		it('should convert megabytes to kilobytes', () => {
			expect(convertValue(1, 'mbytes', 'kbytes')).toBe(1024);
		});

		it('should convert gigabytes to megabytes', () => {
			expect(convertValue(1, 'gbytes', 'mbytes')).toBe(1024);
		});

		it('should convert kilobytes to megabytes', () => {
			expect(convertValue(1024, 'kbytes', 'mbytes')).toBe(1);
		});

		it('should convert bits to gigabytes', () => {
			// 12 GB = 103079215104 bits
			expect(convertValue(103079215104, 'bits', 'gbytes')).toBe(12);
		});
	});

	describe('time', () => {
		it('should convert milliseconds to seconds', () => {
			expect(convertValue(1000, 'ms', 's')).toBe(1);
		});

		it('should convert seconds to milliseconds', () => {
			expect(convertValue(1, 's', 'ms')).toBe(1000);
		});

		it('should convert nanoseconds to milliseconds', () => {
			expect(convertValue(1000000, 'ns', 'ms')).toBe(1);
		});

		it('should convert seconds to minutes', () => {
			expect(convertValue(60, 's', 'm')).toBe(1);
		});

		it('should convert minutes to hours', () => {
			expect(convertValue(60, 'm', 'h')).toBe(1);
		});
	});

	describe('data rate', () => {
		it('should convert bytes/sec to kibibytes/sec', () => {
			expect(convertValue(1024, 'binBps', 'KiBs')).toBe(1);
		});

		it('should convert kibibytes/sec to bytes/sec', () => {
			expect(convertValue(1, 'KiBs', 'binBps')).toBe(1024);
		});
	});

	describe('throughput', () => {
		it('should convert counts per second to counts per minute', () => {
			expect(convertValue(1, 'cps', 'cpm')).toBe(1 / 60);
		});

		it('should convert operations per second to operations per minute', () => {
			expect(convertValue(1, 'ops', 'opm')).toBe(1 / 60);
		});

		it('should convert counts per minute to counts per second', () => {
			expect(convertValue(1, 'cpm', 'cps')).toBe(60);
		});

		it('should convert operations per minute to operations per second', () => {
			expect(convertValue(1, 'opm', 'ops')).toBe(60);
		});
	});

	describe('percent', () => {
		it('should convert percentunit to percent', () => {
			expect(convertValue(0.5, 'percentunit', 'percent')).toBe(50);
		});

		it('should convert percent to percentunit', () => {
			expect(convertValue(50, 'percent', 'percentunit')).toBe(0.5);
		});
	});

	describe('invalid values', () => {
		it('should return null when currentUnit is invalid', () => {
			expect(convertValue(100, 'invalidUnit', 'bytes')).toBeNull();
		});

		it('should return null when targetUnit is invalid', () => {
			expect(convertValue(100, 'bytes', 'invalidUnit')).toBeNull();
		});
	});
});

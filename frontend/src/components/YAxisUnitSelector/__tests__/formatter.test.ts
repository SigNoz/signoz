import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import {
	AdditionalLabelsMappingForGrafanaUnits,
	UniversalUnitToGrafanaUnit,
} from '../constants';
import { formatUniversalUnit } from '../formatter';

const VALUE_BELOW_THRESHOLD = 900;

describe('formatUniversalUnit', () => {
	describe('Time', () => {
		it('formats time values below conversion threshold', () => {
			expect(formatUniversalUnit(31, UniversalYAxisUnit.DAYS)).toBe('4.43 weeks');
			expect(formatUniversalUnit(25, UniversalYAxisUnit.HOURS)).toBe('1.04 days');
			expect(formatUniversalUnit(61, UniversalYAxisUnit.MINUTES)).toBe(
				'1.02 hours',
			);
			expect(formatUniversalUnit(61, UniversalYAxisUnit.SECONDS)).toBe(
				'1.02 mins',
			);
			expect(formatUniversalUnit(1006, UniversalYAxisUnit.MILLISECONDS)).toBe(
				'1.01 s',
			);
			expect(formatUniversalUnit(100006, UniversalYAxisUnit.MICROSECONDS)).toBe(
				'100 ms',
			);
			expect(formatUniversalUnit(1006, UniversalYAxisUnit.NANOSECONDS)).toBe(
				'1.01 µs',
			);
		});
	});

	describe('Data', () => {
		it('formats data values below conversion threshold', () => {
			expect(
				formatUniversalUnit(VALUE_BELOW_THRESHOLD, UniversalYAxisUnit.BYTES),
			).toBe('900 B');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.KILOBYTES)).toBe(
				'900 kB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MEGABYTES)).toBe(
				'900 MB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.GIGABYTES)).toBe(
				'900 GB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TERABYTES)).toBe(
				'900 TB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PETABYTES)).toBe(
				'900 PB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.EXABYTES)).toBe('900 EB');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ZETTABYTES)).toBe(
				'900 ZB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.YOTTABYTES)).toBe(
				'900 YB',
			);
		});

		it('formats data values above conversion threshold with scaling', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.BYTES)).toBe('1 kB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.KILOBYTES)).toBe('1 MB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.MEGABYTES)).toBe('1 GB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.GIGABYTES)).toBe('1 TB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.TERABYTES)).toBe('1 PB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.PETABYTES)).toBe('1 EB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.EXABYTES)).toBe('1 ZB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.ZETTABYTES)).toBe(
				'1 YB',
			);
		});

		it('formats data values above conversion threshold with decimals', () => {
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.BYTES)).toBe('1.03 kB');
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.KILOBYTES)).toBe(
				'1.03 MB',
			);
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.MEGABYTES)).toBe(
				'1.03 GB',
			);
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.TERABYTES)).toBe(
				'1.03 PB',
			);
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.PETABYTES)).toBe(
				'1.03 EB',
			);
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.EXABYTES)).toBe(
				'1.03 ZB',
			);
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.ZETTABYTES)).toBe(
				'1.03 YB',
			);
			expect(formatUniversalUnit(1034, UniversalYAxisUnit.YOTTABYTES)).toBe(
				'1034 YB',
			);
		});
	});

	describe('Data rate', () => {
		it('formats data rate values below conversion threshold', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.BYTES_SECOND)).toBe(
				'900 B/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.KILOBYTES_SECOND)).toBe(
				'900 kB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MEGABYTES_SECOND)).toBe(
				'900 MB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.GIGABYTES_SECOND)).toBe(
				'900 GB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TERABYTES_SECOND)).toBe(
				'900 TB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PETABYTES_SECOND)).toBe(
				'900 PB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.EXABYTES_SECOND)).toBe(
				'900 EB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ZETTABYTES_SECOND)).toBe(
				'900 ZB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.YOTTABYTES_SECOND)).toBe(
				'900 YB/s',
			);
		});

		it('formats data rate values above conversion threshold with scaling (1000)', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.BYTES_SECOND)).toBe(
				'1 kB/s',
			);
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.KILOBYTES_SECOND)).toBe(
				'1 MB/s',
			);
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.MEGABYTES_SECOND)).toBe(
				'1 GB/s',
			);
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.GIGABYTES_SECOND)).toBe(
				'1 TB/s',
			);
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.TERABYTES_SECOND)).toBe(
				'1 PB/s',
			);
		});
	});

	describe('Bit', () => {
		it('formats bit values below conversion threshold', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.BITS)).toBe('900 b');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.KILOBITS)).toBe('900 kb');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MEGABITS)).toBe('900 Mb');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.GIGABITS)).toBe('900 Gb');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TERABITS)).toBe('900 Tb');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PETABITS)).toBe('900 Pb');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.EXABITS)).toBe('900 Eb');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ZETTABITS)).toBe(
				'900 Zb',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.YOTTABITS)).toBe(
				'900 Yb',
			);
		});

		it('formats bit values above conversion threshold with scaling (1000)', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.BITS)).toBe('1 kb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.KILOBITS)).toBe('1 Mb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.MEGABITS)).toBe('1 Gb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.GIGABITS)).toBe('1 Tb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.TERABITS)).toBe('1 Pb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.PETABITS)).toBe('1 Eb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.EXABITS)).toBe('1 Zb');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.ZETTABITS)).toBe('1 Yb');
		});

		it('formats bit values below conversion threshold with decimals (0.5)', () => {
			expect(formatUniversalUnit(0.5, UniversalYAxisUnit.KILOBITS)).toBe('500 b');
			expect(formatUniversalUnit(0.001, UniversalYAxisUnit.MEGABITS)).toBe('1 kb');
		});
	});

	describe('Bit rate', () => {
		it('formats bit rate values below conversion threshold', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.BITS_SECOND)).toBe(
				'900 b/s',
			);
		});

		it('formats bit rate values above conversion threshold with scaling (1000)', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.BITS_SECOND)).toBe(
				'1 kb/s',
			);
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.KILOBITS_SECOND)).toBe(
				'1 Mb/s',
			);
		});
	});

	describe('Count', () => {
		it('formats small values without abbreviation', () => {
			expect(formatUniversalUnit(100, UniversalYAxisUnit.COUNT)).toBe('100');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.COUNT)).toBe('900');
		});

		it('formats count values above conversion threshold with scaling (1000)', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.COUNT)).toBe('1 K');
			expect(formatUniversalUnit(10000, UniversalYAxisUnit.COUNT)).toBe('10 K');
			expect(formatUniversalUnit(100000, UniversalYAxisUnit.COUNT)).toBe('100 K');
			expect(formatUniversalUnit(1000000, UniversalYAxisUnit.COUNT)).toBe('1 Mil');
			expect(formatUniversalUnit(10000000, UniversalYAxisUnit.COUNT)).toBe(
				'10 Mil',
			);
			expect(formatUniversalUnit(100000000, UniversalYAxisUnit.COUNT)).toBe(
				'100 Mil',
			);
			expect(formatUniversalUnit(1000000000, UniversalYAxisUnit.COUNT)).toBe(
				'1 Bil',
			);
			expect(formatUniversalUnit(1000000000000, UniversalYAxisUnit.COUNT)).toBe(
				'1 Tri',
			);
		});

		it('formats count per time units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.COUNT_SECOND)).toBe(
				'900 c/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.COUNT_MINUTE)).toBe(
				'900 c/m',
			);
		});
	});

	describe('Operations units', () => {
		it('formats operations per time', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.OPS_SECOND)).toBe(
				'900 ops/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.OPS_MINUTE)).toBe(
				'900 ops/m',
			);
		});
	});

	describe('Request units', () => {
		it('formats requests per time', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.REQUESTS_SECOND)).toBe(
				'900 req/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.REQUESTS_MINUTE)).toBe(
				'900 req/m',
			);
		});
	});

	describe('Read/Write units', () => {
		it('formats reads and writes per time', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.READS_SECOND)).toBe(
				'900 rd/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.WRITES_SECOND)).toBe(
				'900 wr/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.READS_MINUTE)).toBe(
				'900 rd/m',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.WRITES_MINUTE)).toBe(
				'900 wr/m',
			);
		});
	});

	describe('IO Operations units', () => {
		it('formats IOPS', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.IOOPS_SECOND)).toBe(
				'900 io/s',
			);
		});
	});

	describe('Percent units', () => {
		it('formats percent as-is', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PERCENT)).toBe('900%');
		});

		it('multiplies percent_unit by 100', () => {
			expect(formatUniversalUnit(9, UniversalYAxisUnit.PERCENT_UNIT)).toBe('900%');
		});
	});

	describe('None unit', () => {
		it('formats as plain number', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.NONE)).toBe('900');
		});
	});

	describe('High-order byte scaling', () => {
		it('scales between EB, ZB, YB', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.EXABYTES)).toBe('1 ZB');
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.ZETTABYTES)).toBe(
				'1 YB',
			);
		});
	});
});

describe('Mapping Validator', () => {
	it('validates that all units have a mapping', () => {
		// Each universal unit should have a mapping to a 1:1 Grafana unit in UniversalUnitToGrafanaUnit or an additional mapping in AdditionalLabelsMappingForGrafanaUnits
		const units = Object.values(UniversalYAxisUnit);
		expect(
			units.every((unit) => {
				const hasBaseMapping = unit in UniversalUnitToGrafanaUnit;
				const hasAdditionalMapping = unit in AdditionalLabelsMappingForGrafanaUnits;
				const hasMapping = hasBaseMapping || hasAdditionalMapping;
				if (!hasMapping) {
					console.error(`Unit ${unit} does not have a mapping`);
				}
				return hasMapping;
			}),
		).toBe(true);
	});
});

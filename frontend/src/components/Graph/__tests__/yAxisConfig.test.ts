import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import { getToolTipValue } from '../yAxisConfig';

describe('getToolTipValue', () => {
	it('returns the correct value for a universal unit whose mapping is found', () => {
		// Data
		expect(getToolTipValue('900', UniversalYAxisUnit.BYTES)).toBe('900 B');
		expect(getToolTipValue('900', UniversalYAxisUnit.KILOBYTES)).toBe('900 kB');
		expect(getToolTipValue('900', UniversalYAxisUnit.MEGABYTES)).toBe('900 MB');
		expect(getToolTipValue('900', UniversalYAxisUnit.GIGABYTES)).toBe('900 GB');
		expect(getToolTipValue('900', UniversalYAxisUnit.TERABYTES)).toBe('900 TB');
		expect(getToolTipValue('900', UniversalYAxisUnit.PETABYTES)).toBe('900 PB');
		expect(getToolTipValue('900', UniversalYAxisUnit.EXABYTES)).toBe('900 EB');
		expect(getToolTipValue('900', UniversalYAxisUnit.ZETTABYTES)).toBe('900 ZB');
		expect(getToolTipValue('900', UniversalYAxisUnit.YOTTABYTES)).toBe('900 YB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.BYTES)).toBe('1 kB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.KILOBYTES)).toBe('1 MB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.MEGABYTES)).toBe('1 GB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.GIGABYTES)).toBe('1 TB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.TERABYTES)).toBe('1 PB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.PETABYTES)).toBe('1 EB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.EXABYTES)).toBe('1 ZB');
		expect(getToolTipValue('1000', UniversalYAxisUnit.ZETTABYTES)).toBe('1 YB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.BYTES)).toBe('1.03 kB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.KILOBYTES)).toBe('1.03 MB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.MEGABYTES)).toBe('1.03 GB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.TERABYTES)).toBe('1.03 PB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.PETABYTES)).toBe('1.03 EB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.EXABYTES)).toBe('1.03 ZB');
		expect(getToolTipValue('1034', UniversalYAxisUnit.ZETTABYTES)).toBe(
			'1.03 YB',
		);

		// Data Rate
		expect(getToolTipValue('900', UniversalYAxisUnit.BYTES_SECOND)).toBe(
			'900 B/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.KILOBYTES_SECOND)).toBe(
			'900 kB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.MEGABYTES_SECOND)).toBe(
			'900 MB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.GIGABYTES_SECOND)).toBe(
			'900 GB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.TERABYTES_SECOND)).toBe(
			'900 TB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.PETABYTES_SECOND)).toBe(
			'900 PB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.EXABYTES_SECOND)).toBe(
			'900 EB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.ZETTABYTES_SECOND)).toBe(
			'900 ZB/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.YOTTABYTES_SECOND)).toBe(
			'900 YB/s',
		);
		expect(getToolTipValue('1000', UniversalYAxisUnit.BYTES_SECOND)).toBe(
			'1 kB/s',
		);
		expect(getToolTipValue('1000', UniversalYAxisUnit.KILOBYTES_SECOND)).toBe(
			'1 MB/s',
		);
		expect(getToolTipValue('1000', UniversalYAxisUnit.MEGABYTES_SECOND)).toBe(
			'1 GB/s',
		);
		expect(getToolTipValue('1000', UniversalYAxisUnit.GIGABYTES_SECOND)).toBe(
			'1 TB/s',
		);
		expect(getToolTipValue('1000', UniversalYAxisUnit.TERABYTES_SECOND)).toBe(
			'1 PB/s',
		);

		// Bits
		expect(getToolTipValue('900', UniversalYAxisUnit.BITS)).toBe('900 b');
		expect(getToolTipValue('900', UniversalYAxisUnit.KILOBITS)).toBe('900 Kb');
		expect(getToolTipValue('900', UniversalYAxisUnit.MEGABITS)).toBe('900 Mb');
		expect(getToolTipValue('900', UniversalYAxisUnit.GIGABITS)).toBe('900 Gb');
		expect(getToolTipValue('900', UniversalYAxisUnit.TERABITS)).toBe('900 Tb');
		expect(getToolTipValue('900', UniversalYAxisUnit.PETABITS)).toBe('900 Pb');
		expect(getToolTipValue('900', UniversalYAxisUnit.EXABITS)).toBe('900 Eb');
		expect(getToolTipValue('900', UniversalYAxisUnit.ZETTABITS)).toBe('900 Zb');
		expect(getToolTipValue('900', UniversalYAxisUnit.YOTTABITS)).toBe('900 Yb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.BITS)).toBe('1 Kb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.KILOBITS)).toBe('1 Mb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.MEGABITS)).toBe('1 Gb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.GIGABITS)).toBe('1 Tb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.TERABITS)).toBe('1 Pb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.PETABITS)).toBe('1 Eb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.EXABITS)).toBe('1 Zb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.ZETTABITS)).toBe('1 Yb');

		// Count
		expect(getToolTipValue('900', UniversalYAxisUnit.COUNT)).toBe('900');
		expect(getToolTipValue('900', UniversalYAxisUnit.COUNT_SECOND)).toBe(
			'900 c/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.COUNT_MINUTE)).toBe(
			'900 c/m',
		);

		// Operations
		expect(getToolTipValue('900', UniversalYAxisUnit.OPS_SECOND)).toBe(
			'900 ops/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.OPS_MINUTE)).toBe(
			'900 ops/m',
		);

		// Requests
		expect(getToolTipValue('900', UniversalYAxisUnit.REQUESTS_SECOND)).toBe(
			'900 req/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.REQUESTS_MINUTE)).toBe(
			'900 req/m',
		);

		// Reads/Writes
		expect(getToolTipValue('900', UniversalYAxisUnit.READS_SECOND)).toBe(
			'900 rd/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.WRITES_SECOND)).toBe(
			'900 wr/s',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.READS_MINUTE)).toBe(
			'900 rd/m',
		);
		expect(getToolTipValue('900', UniversalYAxisUnit.WRITES_MINUTE)).toBe(
			'900 wr/m',
		);

		// IO Operations
		expect(getToolTipValue('900', UniversalYAxisUnit.IOOPS_SECOND)).toBe(
			'900 io/s',
		);

		// Percent
		expect(getToolTipValue('900', UniversalYAxisUnit.PERCENT)).toBe('900%');
		expect(getToolTipValue('9', UniversalYAxisUnit.PERCENT_UNIT)).toBe('900%');

		// None
		expect(getToolTipValue('900', UniversalYAxisUnit.NONE)).toBe('900');
	});

	it('returns the correct value for units that use short format (with truncation)', () => {
		expect(getToolTipValue('100', UniversalYAxisUnit.COUNT)).toBe('100');
		expect(getToolTipValue('1000', UniversalYAxisUnit.COUNT)).toBe('1 K');
		expect(getToolTipValue('10000', UniversalYAxisUnit.COUNT)).toBe('10 K');
		expect(getToolTipValue('100000', UniversalYAxisUnit.COUNT)).toBe('100 K');
		expect(getToolTipValue('1000000', UniversalYAxisUnit.COUNT)).toBe('1 Mil');
		expect(getToolTipValue('10000000', UniversalYAxisUnit.COUNT)).toBe('10 Mil');
		expect(getToolTipValue('100000000', UniversalYAxisUnit.COUNT)).toBe(
			'100 Mil',
		);
		expect(getToolTipValue('1000000000', UniversalYAxisUnit.COUNT)).toBe('1 Bil');
		expect(getToolTipValue('1000000000000', UniversalYAxisUnit.COUNT)).toBe(
			'1 Tri',
		);
	});

	it('returns the correct value for units with custom mappings from AdditionalLabelsMappingForGrafanaUnits', () => {
		expect(getToolTipValue('900', UniversalYAxisUnit.BITS)).toBe('900 b');
		expect(getToolTipValue('900', UniversalYAxisUnit.KILOBITS)).toBe('900 Kb');
		expect(getToolTipValue('900', UniversalYAxisUnit.MEGABITS)).toBe('900 Mb');
		expect(getToolTipValue('900', UniversalYAxisUnit.GIGABITS)).toBe('900 Gb');
		expect(getToolTipValue('900', UniversalYAxisUnit.TERABITS)).toBe('900 Tb');
		expect(getToolTipValue('900', UniversalYAxisUnit.PETABITS)).toBe('900 Pb');
		expect(getToolTipValue('900', UniversalYAxisUnit.EXABITS)).toBe('900 Eb');
		expect(getToolTipValue('900', UniversalYAxisUnit.ZETTABITS)).toBe('900 Zb');
		expect(getToolTipValue('900', UniversalYAxisUnit.YOTTABITS)).toBe('900 Yb');

		expect(getToolTipValue('1000', UniversalYAxisUnit.BITS)).toBe('1 Kb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.KILOBITS)).toBe('1 Mb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.MEGABITS)).toBe('1 Gb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.GIGABITS)).toBe('1 Tb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.TERABITS)).toBe('1 Pb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.PETABITS)).toBe('1 Eb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.EXABITS)).toBe('1 Zb');
		expect(getToolTipValue('1000', UniversalYAxisUnit.ZETTABITS)).toBe('1 Yb');
	});

	it('returns the correct value for unmapped/unknown units', () => {
		expect(getToolTipValue('100', 'unknown_unit')).toBe('100 unknown_unit');
	});
});

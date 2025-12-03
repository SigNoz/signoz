import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import {
	AdditionalLabelsMappingForGrafanaUnits,
	UniversalUnitToGrafanaUnit,
} from '../constants';
import { formatUniversalUnit } from '../formatter';

describe('formatUniversalUnit', () => {
	describe('Time', () => {
		test.each([
			// Days
			[31, UniversalYAxisUnit.DAYS, '4.43 weeks'],
			[7, UniversalYAxisUnit.DAYS, '1 week'],
			[6, UniversalYAxisUnit.DAYS, '6 days'],
			[1, UniversalYAxisUnit.DAYS, '1 day'],
			// Hours
			[25, UniversalYAxisUnit.HOURS, '1.04 days'],
			[23, UniversalYAxisUnit.HOURS, '23 hour'],
			[1, UniversalYAxisUnit.HOURS, '1 hour'],
			// Minutes
			[61, UniversalYAxisUnit.MINUTES, '1.02 hours'],
			[60, UniversalYAxisUnit.MINUTES, '1 hour'],
			[45, UniversalYAxisUnit.MINUTES, '45 min'],
			[1, UniversalYAxisUnit.MINUTES, '1 min'],
			// Seconds
			[100000, UniversalYAxisUnit.SECONDS, '1.16 days'],
			[10065, UniversalYAxisUnit.SECONDS, '2.8 hours'],
			[61, UniversalYAxisUnit.SECONDS, '1.02 mins'],
			[60, UniversalYAxisUnit.SECONDS, '1 min'],
			[12, UniversalYAxisUnit.SECONDS, '12 s'],
			[1, UniversalYAxisUnit.SECONDS, '1 s'],
			// Milliseconds
			[1006, UniversalYAxisUnit.MILLISECONDS, '1.01 s'],
			[10000000, UniversalYAxisUnit.MILLISECONDS, '2.78 hours'],
			[100006, UniversalYAxisUnit.MICROSECONDS, '100 ms'],
			[1, UniversalYAxisUnit.MICROSECONDS, '1 µs'],
			[12, UniversalYAxisUnit.MICROSECONDS, '12 µs'],
			// Nanoseconds
			[10000000000, UniversalYAxisUnit.NANOSECONDS, '10 s'],
			[10000006, UniversalYAxisUnit.NANOSECONDS, '10 ms'],
			[1006, UniversalYAxisUnit.NANOSECONDS, '1.01 µs'],
			[1, UniversalYAxisUnit.NANOSECONDS, '1 ns'],
			[12, UniversalYAxisUnit.NANOSECONDS, '12 ns'],
		])('formats time value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Data', () => {
		test.each([
			// Bytes
			[864, UniversalYAxisUnit.BYTES, '864 B'],
			[1000, UniversalYAxisUnit.BYTES, '1 kB'],
			[1020, UniversalYAxisUnit.BYTES, '1.02 kB'],
			// Kilobytes
			[512, UniversalYAxisUnit.KILOBYTES, '512 kB'],
			[1000, UniversalYAxisUnit.KILOBYTES, '1 MB'],
			[1023, UniversalYAxisUnit.KILOBYTES, '1.02 MB'],
			// Megabytes
			[777, UniversalYAxisUnit.MEGABYTES, '777 MB'],
			[1000, UniversalYAxisUnit.MEGABYTES, '1 GB'],
			[1023, UniversalYAxisUnit.MEGABYTES, '1.02 GB'],
			// Gigabytes
			[432, UniversalYAxisUnit.GIGABYTES, '432 GB'],
			[1000, UniversalYAxisUnit.GIGABYTES, '1 TB'],
			[1023, UniversalYAxisUnit.GIGABYTES, '1.02 TB'],
			// Terabytes
			[678, UniversalYAxisUnit.TERABYTES, '678 TB'],
			[1000, UniversalYAxisUnit.TERABYTES, '1 PB'],
			[1023, UniversalYAxisUnit.TERABYTES, '1.02 PB'],
			// Petabytes
			[845, UniversalYAxisUnit.PETABYTES, '845 PB'],
			[1000, UniversalYAxisUnit.PETABYTES, '1 EB'],
			[1023, UniversalYAxisUnit.PETABYTES, '1.02 EB'],
			// Exabytes
			[921, UniversalYAxisUnit.EXABYTES, '921 EB'],
			[1000, UniversalYAxisUnit.EXABYTES, '1 ZB'],
			[1023, UniversalYAxisUnit.EXABYTES, '1.02 ZB'],
			// Zettabytes
			[921, UniversalYAxisUnit.ZETTABYTES, '921 ZB'],
			[1000, UniversalYAxisUnit.ZETTABYTES, '1 YB'],
			[1023, UniversalYAxisUnit.ZETTABYTES, '1.02 YB'],
			// Yottabytes
			[921, UniversalYAxisUnit.YOTTABYTES, '921 YB'],
			[1000, UniversalYAxisUnit.YOTTABYTES, '1000 YB'],
			[1023, UniversalYAxisUnit.YOTTABYTES, '1023 YB'],
		])('formats data value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Data rate', () => {
		test.each([
			// Bytes/second
			[864, UniversalYAxisUnit.BYTES_SECOND, '864 B/s'],
			[1000, UniversalYAxisUnit.BYTES_SECOND, '1 kB/s'],
			[1020, UniversalYAxisUnit.BYTES_SECOND, '1.02 kB/s'],
			// Kilobytes/second
			[512, UniversalYAxisUnit.KILOBYTES_SECOND, '512 kB/s'],
			[1000, UniversalYAxisUnit.KILOBYTES_SECOND, '1 MB/s'],
			[1023, UniversalYAxisUnit.KILOBYTES_SECOND, '1.02 MB/s'],
			// Megabytes/second
			[777, UniversalYAxisUnit.MEGABYTES_SECOND, '777 MB/s'],
			[1000, UniversalYAxisUnit.MEGABYTES_SECOND, '1 GB/s'],
			[1023, UniversalYAxisUnit.MEGABYTES_SECOND, '1.02 GB/s'],
			// Gigabytes/second
			[432, UniversalYAxisUnit.GIGABYTES_SECOND, '432 GB/s'],
			[1000, UniversalYAxisUnit.GIGABYTES_SECOND, '1 TB/s'],
			[1023, UniversalYAxisUnit.GIGABYTES_SECOND, '1.02 TB/s'],
			// Terabytes/second
			[678, UniversalYAxisUnit.TERABYTES_SECOND, '678 TB/s'],
			[1000, UniversalYAxisUnit.TERABYTES_SECOND, '1 PB/s'],
			[1023, UniversalYAxisUnit.TERABYTES_SECOND, '1.02 PB/s'],
			// Petabytes/second
			[845, UniversalYAxisUnit.PETABYTES_SECOND, '845 PB/s'],
			[1000, UniversalYAxisUnit.PETABYTES_SECOND, '1 EB/s'],
			[1023, UniversalYAxisUnit.PETABYTES_SECOND, '1.02 EB/s'],
			// Exabytes/second
			[921, UniversalYAxisUnit.EXABYTES_SECOND, '921 EB/s'],
			[1000, UniversalYAxisUnit.EXABYTES_SECOND, '1 ZB/s'],
			[1023, UniversalYAxisUnit.EXABYTES_SECOND, '1.02 ZB/s'],
			// Zettabytes/second
			[921, UniversalYAxisUnit.ZETTABYTES_SECOND, '921 ZB/s'],
			[1000, UniversalYAxisUnit.ZETTABYTES_SECOND, '1 YB/s'],
			[1023, UniversalYAxisUnit.ZETTABYTES_SECOND, '1.02 YB/s'],
			// Yottabytes/second
			[921, UniversalYAxisUnit.YOTTABYTES_SECOND, '921 YB/s'],
			[1000, UniversalYAxisUnit.YOTTABYTES_SECOND, '1000 YB/s'],
			[1023, UniversalYAxisUnit.YOTTABYTES_SECOND, '1023 YB/s'],
		])('formats data value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Bit', () => {
		test.each([
			// Bits
			[1, UniversalYAxisUnit.BITS, '1 b'],
			[250, UniversalYAxisUnit.BITS, '250 b'],
			[1000, UniversalYAxisUnit.BITS, '1 kb'],
			[1023, UniversalYAxisUnit.BITS, '1.02 kb'],
			// Kilobits
			[0.5, UniversalYAxisUnit.KILOBITS, '500 b'],
			[375, UniversalYAxisUnit.KILOBITS, '375 kb'],
			[1000, UniversalYAxisUnit.KILOBITS, '1 Mb'],
			[1023, UniversalYAxisUnit.KILOBITS, '1.02 Mb'],
			// Megabits
			[0.5, UniversalYAxisUnit.MEGABITS, '500 kb'],
			[640, UniversalYAxisUnit.MEGABITS, '640 Mb'],
			[1000, UniversalYAxisUnit.MEGABITS, '1 Gb'],
			[1023, UniversalYAxisUnit.MEGABITS, '1.02 Gb'],
			// Gigabits
			[0.5, UniversalYAxisUnit.GIGABITS, '500 Mb'],
			[875, UniversalYAxisUnit.GIGABITS, '875 Gb'],
			[1000, UniversalYAxisUnit.GIGABITS, '1 Tb'],
			[1023, UniversalYAxisUnit.GIGABITS, '1.02 Tb'],
			// Terabits
			[0.5, UniversalYAxisUnit.TERABITS, '500 Gb'],
			[430, UniversalYAxisUnit.TERABITS, '430 Tb'],
			[1000, UniversalYAxisUnit.TERABITS, '1 Pb'],
			[1023, UniversalYAxisUnit.TERABITS, '1.02 Pb'],
			// Petabits
			[0.5, UniversalYAxisUnit.PETABITS, '500 Tb'],
			[590, UniversalYAxisUnit.PETABITS, '590 Pb'],
			[1000, UniversalYAxisUnit.PETABITS, '1 Eb'],
			[1023, UniversalYAxisUnit.PETABITS, '1.02 Eb'],
			// Exabits
			[0.5, UniversalYAxisUnit.EXABITS, '500 Pb'],
			[715, UniversalYAxisUnit.EXABITS, '715 Eb'],
			[1000, UniversalYAxisUnit.EXABITS, '1 Zb'],
			[1023, UniversalYAxisUnit.EXABITS, '1.02 Zb'],
			// Zettabits
			[0.5, UniversalYAxisUnit.ZETTABITS, '500 Eb'],
			[840, UniversalYAxisUnit.ZETTABITS, '840 Zb'],
			[1000, UniversalYAxisUnit.ZETTABITS, '1 Yb'],
			[1023, UniversalYAxisUnit.ZETTABITS, '1.02 Yb'],
			// Yottabits
			[0.5, UniversalYAxisUnit.YOTTABITS, '500 Zb'],
			[965, UniversalYAxisUnit.YOTTABITS, '965 Yb'],
			[1000, UniversalYAxisUnit.YOTTABITS, '1000 Yb'],
			[1023, UniversalYAxisUnit.YOTTABITS, '1023 Yb'],
		])('formats bit value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Bit rate', () => {
		test.each([
			// Bits/second
			[512, UniversalYAxisUnit.BITS_SECOND, '512 b/s'],
			[1000, UniversalYAxisUnit.BITS_SECOND, '1 kb/s'],
			[1023, UniversalYAxisUnit.BITS_SECOND, '1.02 kb/s'],
			// Kilobits/second
			[0.5, UniversalYAxisUnit.KILOBITS_SECOND, '500 b/s'],
			[512, UniversalYAxisUnit.KILOBITS_SECOND, '512 kb/s'],
			[1000, UniversalYAxisUnit.KILOBITS_SECOND, '1 Mb/s'],
			[1023, UniversalYAxisUnit.KILOBITS_SECOND, '1.02 Mb/s'],
			// Megabits/second
			[0.5, UniversalYAxisUnit.MEGABITS_SECOND, '500 kb/s'],
			[512, UniversalYAxisUnit.MEGABITS_SECOND, '512 Mb/s'],
			[1000, UniversalYAxisUnit.MEGABITS_SECOND, '1 Gb/s'],
			[1023, UniversalYAxisUnit.MEGABITS_SECOND, '1.02 Gb/s'],
			// Gigabits/second
			[0.5, UniversalYAxisUnit.GIGABITS_SECOND, '500 Mb/s'],
			[512, UniversalYAxisUnit.GIGABITS_SECOND, '512 Gb/s'],
			[1000, UniversalYAxisUnit.GIGABITS_SECOND, '1 Tb/s'],
			[1023, UniversalYAxisUnit.GIGABITS_SECOND, '1.02 Tb/s'],
			// Terabits/second
			[0.5, UniversalYAxisUnit.TERABITS_SECOND, '500 Gb/s'],
			[512, UniversalYAxisUnit.TERABITS_SECOND, '512 Tb/s'],
			[1000, UniversalYAxisUnit.TERABITS_SECOND, '1 Pb/s'],
			[1023, UniversalYAxisUnit.TERABITS_SECOND, '1.02 Pb/s'],
			// Petabits/second
			[0.5, UniversalYAxisUnit.PETABITS_SECOND, '500 Tb/s'],
			[512, UniversalYAxisUnit.PETABITS_SECOND, '512 Pb/s'],
			[1000, UniversalYAxisUnit.PETABITS_SECOND, '1 Eb/s'],
			[1023, UniversalYAxisUnit.PETABITS_SECOND, '1.02 Eb/s'],
			// Exabits/second
			[512, UniversalYAxisUnit.EXABITS_SECOND, '512 Eb/s'],
			[1000, UniversalYAxisUnit.EXABITS_SECOND, '1 Zb/s'],
			[1023, UniversalYAxisUnit.EXABITS_SECOND, '1.02 Zb/s'],
			// Zettabits/second
			[0.5, UniversalYAxisUnit.ZETTABITS_SECOND, '500 Eb/s'],
			[512, UniversalYAxisUnit.ZETTABITS_SECOND, '512 Zb/s'],
			[1000, UniversalYAxisUnit.ZETTABITS_SECOND, '1 Yb/s'],
			[1023, UniversalYAxisUnit.ZETTABITS_SECOND, '1.02 Yb/s'],
			// Yottabits/second
			[0.5, UniversalYAxisUnit.YOTTABITS_SECOND, '500 Zb/s'],
			[512, UniversalYAxisUnit.YOTTABITS_SECOND, '512 Yb/s'],
			[1000, UniversalYAxisUnit.YOTTABITS_SECOND, '1000 Yb/s'],
			[1023, UniversalYAxisUnit.YOTTABITS_SECOND, '1023 Yb/s'],
		])('formats bit rate value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Count', () => {
		test.each([
			[100, UniversalYAxisUnit.COUNT, '100'],
			[875, UniversalYAxisUnit.COUNT, '875'],
			[1000, UniversalYAxisUnit.COUNT, '1 K'],
			[2500, UniversalYAxisUnit.COUNT, '2.5 K'],
			[10000, UniversalYAxisUnit.COUNT, '10 K'],
			[25000, UniversalYAxisUnit.COUNT, '25 K'],
			[100000, UniversalYAxisUnit.COUNT, '100 K'],
			[1000000, UniversalYAxisUnit.COUNT, '1 Mil'],
			[10000000, UniversalYAxisUnit.COUNT, '10 Mil'],
			[100000000, UniversalYAxisUnit.COUNT, '100 Mil'],
			[1000000000, UniversalYAxisUnit.COUNT, '1 Bil'],
			[10000000000, UniversalYAxisUnit.COUNT, '10 Bil'],
			[100000000000, UniversalYAxisUnit.COUNT, '100 Bil'],
			[1000000000000, UniversalYAxisUnit.COUNT, '1 Tri'],
			[10000000000000, UniversalYAxisUnit.COUNT, '10 Tri'],
		])('formats count value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});

		test.each([
			[100, UniversalYAxisUnit.COUNT_SECOND, '100 c/s'],
			[875, UniversalYAxisUnit.COUNT_SECOND, '875 c/s'],
			[1000, UniversalYAxisUnit.COUNT_SECOND, '1K c/s'],
			[2500, UniversalYAxisUnit.COUNT_SECOND, '2.5K c/s'],
			[10000, UniversalYAxisUnit.COUNT_SECOND, '10K c/s'],
			[25000, UniversalYAxisUnit.COUNT_SECOND, '25K c/s'],
		])('formats count per time value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});

		test.each([
			[100, UniversalYAxisUnit.COUNT_MINUTE, '100 c/m'],
			[875, UniversalYAxisUnit.COUNT_MINUTE, '875 c/m'],
			[1000, UniversalYAxisUnit.COUNT_MINUTE, '1K c/m'],
			[2500, UniversalYAxisUnit.COUNT_MINUTE, '2.5K c/m'],
			[10000, UniversalYAxisUnit.COUNT_MINUTE, '10K c/m'],
			[25000, UniversalYAxisUnit.COUNT_MINUTE, '25K c/m'],
		])('formats count per time value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Operations units', () => {
		test.each([
			[780, UniversalYAxisUnit.OPS_SECOND, '780 ops/s'],
			[1000, UniversalYAxisUnit.OPS_SECOND, '1K ops/s'],
			[520, UniversalYAxisUnit.OPS_MINUTE, '520 ops/m'],
			[1000, UniversalYAxisUnit.OPS_MINUTE, '1K ops/m'],
			[2500, UniversalYAxisUnit.OPS_MINUTE, '2.5K ops/m'],
			[10000, UniversalYAxisUnit.OPS_MINUTE, '10K ops/m'],
			[25000, UniversalYAxisUnit.OPS_MINUTE, '25K ops/m'],
		])(
			'formats operations per time value %s %s as %s',
			(value, unit, expected) => {
				expect(formatUniversalUnit(value, unit)).toBe(expected);
			},
		);
	});

	describe('Request units', () => {
		test.each([
			[615, UniversalYAxisUnit.REQUESTS_SECOND, '615 req/s'],
			[1000, UniversalYAxisUnit.REQUESTS_SECOND, '1K req/s'],
			[480, UniversalYAxisUnit.REQUESTS_MINUTE, '480 req/m'],
			[1000, UniversalYAxisUnit.REQUESTS_MINUTE, '1K req/m'],
			[2500, UniversalYAxisUnit.REQUESTS_MINUTE, '2.5K req/m'],
			[10000, UniversalYAxisUnit.REQUESTS_MINUTE, '10K req/m'],
			[25000, UniversalYAxisUnit.REQUESTS_MINUTE, '25K req/m'],
		])('formats requests per time value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Read/Write units', () => {
		test.each([
			[505, UniversalYAxisUnit.READS_SECOND, '505 rd/s'],
			[1000, UniversalYAxisUnit.READS_SECOND, '1K rd/s'],
			[610, UniversalYAxisUnit.WRITES_SECOND, '610 wr/s'],
			[1000, UniversalYAxisUnit.WRITES_SECOND, '1K wr/s'],
			[715, UniversalYAxisUnit.READS_MINUTE, '715 rd/m'],
			[1000, UniversalYAxisUnit.READS_MINUTE, '1K rd/m'],
			[2500, UniversalYAxisUnit.READS_MINUTE, '2.5K rd/m'],
			[10000, UniversalYAxisUnit.READS_MINUTE, '10K rd/m'],
			[25000, UniversalYAxisUnit.READS_MINUTE, '25K rd/m'],
			[830, UniversalYAxisUnit.WRITES_MINUTE, '830 wr/m'],
			[1000, UniversalYAxisUnit.WRITES_MINUTE, '1K wr/m'],
			[2500, UniversalYAxisUnit.WRITES_MINUTE, '2.5K wr/m'],
			[10000, UniversalYAxisUnit.WRITES_MINUTE, '10K wr/m'],
			[25000, UniversalYAxisUnit.WRITES_MINUTE, '25K wr/m'],
		])(
			'formats reads and writes per time value %s %s as %s',
			(value, unit, expected) => {
				expect(formatUniversalUnit(value, unit)).toBe(expected);
			},
		);
	});

	describe('IO Operations units', () => {
		test.each([
			[777, UniversalYAxisUnit.IOOPS_SECOND, '777 io/s'],
			[1000, UniversalYAxisUnit.IOOPS_SECOND, '1K io/s'],
			[2500, UniversalYAxisUnit.IOOPS_SECOND, '2.5K io/s'],
			[10000, UniversalYAxisUnit.IOOPS_SECOND, '10K io/s'],
			[25000, UniversalYAxisUnit.IOOPS_SECOND, '25K io/s'],
		])('formats IOPS value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Percent units', () => {
		it('formats percent as-is', () => {
			expect(formatUniversalUnit(456, UniversalYAxisUnit.PERCENT)).toBe('456%');
		});

		it('multiplies percent_unit by 100', () => {
			expect(formatUniversalUnit(9, UniversalYAxisUnit.PERCENT_UNIT)).toBe('900%');
		});
	});

	describe('None unit', () => {
		it('formats as plain number', () => {
			expect(formatUniversalUnit(742, UniversalYAxisUnit.NONE)).toBe('742');
		});
	});

	describe('Time (additional)', () => {
		test.each([
			[900, UniversalYAxisUnit.DURATION_MS, '900 milliseconds'],
			[1000, UniversalYAxisUnit.DURATION_MS, '1 second'],
			[1, UniversalYAxisUnit.DURATION_MS, '1 millisecond'],
			[900, UniversalYAxisUnit.DURATION_S, '15 minutes'],
			[1, UniversalYAxisUnit.DURATION_HMS, '00:00:01'],
			[90005, UniversalYAxisUnit.DURATION_HMS, '25:00:05'],
			[90005, UniversalYAxisUnit.DURATION_DHMS, '1 d 01:00:05'],
			[900, UniversalYAxisUnit.TIMETICKS, '9 s'],
			[1, UniversalYAxisUnit.TIMETICKS, '10 ms'],
			[900, UniversalYAxisUnit.CLOCK_MS, '900ms'],
			[1, UniversalYAxisUnit.CLOCK_MS, '001ms'],
			[1, UniversalYAxisUnit.CLOCK_S, '01s:000ms'],
			[900, UniversalYAxisUnit.CLOCK_S, '15m:00s:000ms'],
			[900, UniversalYAxisUnit.TIME_HERTZ, '900 Hz'],
			[1000, UniversalYAxisUnit.TIME_HERTZ, '1 kHz'],
			[1000000, UniversalYAxisUnit.TIME_HERTZ, '1 MHz'],
			[1000000000, UniversalYAxisUnit.TIME_HERTZ, '1 GHz'],
			[1008, UniversalYAxisUnit.TIME_HERTZ, '1.01 kHz'],
		])('formats duration value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Data (IEC/Binary)', () => {
		test.each([
			// Bytes
			[900, UniversalYAxisUnit.BYTES_IEC, '900 B'],
			[1024, UniversalYAxisUnit.BYTES_IEC, '1 KiB'],
			[1080, UniversalYAxisUnit.BYTES_IEC, '1.05 KiB'],
			// Kibibytes
			[900, UniversalYAxisUnit.KIBIBYTES, '900 KiB'],
			[1024, UniversalYAxisUnit.KIBIBYTES, '1 MiB'],
			[1080, UniversalYAxisUnit.KIBIBYTES, '1.05 MiB'],
			// Mebibytes
			[900, UniversalYAxisUnit.MEBIBYTES, '900 MiB'],
			[1024, UniversalYAxisUnit.MEBIBYTES, '1 GiB'],
			[1080, UniversalYAxisUnit.MEBIBYTES, '1.05 GiB'],
			// Gibibytes
			[900, UniversalYAxisUnit.GIBIBYTES, '900 GiB'],
			[1024, UniversalYAxisUnit.GIBIBYTES, '1 TiB'],
			[1080, UniversalYAxisUnit.GIBIBYTES, '1.05 TiB'],
			// Tebibytes
			[900, UniversalYAxisUnit.TEBIBYTES, '900 TiB'],
			[1024, UniversalYAxisUnit.TEBIBYTES, '1 PiB'],
			[1080, UniversalYAxisUnit.TEBIBYTES, '1.05 PiB'],
			// Pebibytes
			[900, UniversalYAxisUnit.PEBIBYTES, '900 PiB'],
			[1024, UniversalYAxisUnit.PEBIBYTES, '1 EiB'],
			[1080, UniversalYAxisUnit.PEBIBYTES, '1.05 EiB'],
			// Exbibytes
			[900, UniversalYAxisUnit.EXBIBYTES, '900 EiB'],
			[1024, UniversalYAxisUnit.EXBIBYTES, '1 ZiB'],
			[1080, UniversalYAxisUnit.EXBIBYTES, '1.05 ZiB'],
			// Zebibytes
			[900, UniversalYAxisUnit.ZEBIBYTES, '900 ZiB'],
			[1024, UniversalYAxisUnit.ZEBIBYTES, '1 YiB'],
			[1080, UniversalYAxisUnit.ZEBIBYTES, '1.05 YiB'],
			// Yobibytes
			[900, UniversalYAxisUnit.YOBIBYTES, '900 YiB'],
			[1024, UniversalYAxisUnit.YOBIBYTES, '1024 YiB'],
		])('formats IEC bytes value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Data Rate (IEC/Binary)', () => {
		test.each([
			// Kibibytes/second
			[900, UniversalYAxisUnit.KIBIBYTES_SECOND, '900 KiB/s'],
			[1024, UniversalYAxisUnit.KIBIBYTES_SECOND, '1 MiB/s'],
			[1080, UniversalYAxisUnit.KIBIBYTES_SECOND, '1.05 MiB/s'],
			// Mebibytes/second
			[900, UniversalYAxisUnit.MEBIBYTES_SECOND, '900 MiB/s'],
			[1024, UniversalYAxisUnit.MEBIBYTES_SECOND, '1 GiB/s'],
			[1080, UniversalYAxisUnit.MEBIBYTES_SECOND, '1.05 GiB/s'],
			// Gibibytes/second
			[900, UniversalYAxisUnit.GIBIBYTES_SECOND, '900 GiB/s'],
			[1024, UniversalYAxisUnit.GIBIBYTES_SECOND, '1 TiB/s'],
			[1080, UniversalYAxisUnit.GIBIBYTES_SECOND, '1.05 TiB/s'],
			// Tebibytes/second
			[900, UniversalYAxisUnit.TEBIBYTES_SECOND, '900 TiB/s'],
			[1024, UniversalYAxisUnit.TEBIBYTES_SECOND, '1 PiB/s'],
			[1080, UniversalYAxisUnit.TEBIBYTES_SECOND, '1.05 PiB/s'],
			// Pebibytes/second
			[900, UniversalYAxisUnit.PEBIBYTES_SECOND, '900 PiB/s'],
			[1024, UniversalYAxisUnit.PEBIBYTES_SECOND, '1 EiB/s'],
			[1080, UniversalYAxisUnit.PEBIBYTES_SECOND, '1.05 EiB/s'],
			// Exbibytes/second
			[900, UniversalYAxisUnit.EXBIBYTES_SECOND, '900 EiB/s'],
			[1024, UniversalYAxisUnit.EXBIBYTES_SECOND, '1 ZiB/s'],
			[1080, UniversalYAxisUnit.EXBIBYTES_SECOND, '1.05 ZiB/s'],
			// Zebibytes/second
			[900, UniversalYAxisUnit.ZEBIBYTES_SECOND, '900 ZiB/s'],
			[1024, UniversalYAxisUnit.ZEBIBYTES_SECOND, '1 YiB/s'],
			[1080, UniversalYAxisUnit.ZEBIBYTES_SECOND, '1.05 YiB/s'],
			// Yobibytes/second
			[900, UniversalYAxisUnit.YOBIBYTES_SECOND, '900 YiB/s'],
			[1024, UniversalYAxisUnit.YOBIBYTES_SECOND, '1024 YiB/s'],
			[1080, UniversalYAxisUnit.YOBIBYTES_SECOND, '1080 YiB/s'],
			// Packets/second
			[900, UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND, '900 p/s'],
			[1000, UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND, '1 kp/s'],
			[1080, UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND, '1.08 kp/s'],
		])('formats IEC byte rates value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Bits (IEC)', () => {
		test.each([
			[900, UniversalYAxisUnit.BITS_IEC, '900 b'],
			[1024, UniversalYAxisUnit.BITS_IEC, '1 Kib'],
			[1080, UniversalYAxisUnit.BITS_IEC, '1.05 Kib'],
		])('formats IEC bits value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Hash Rate', () => {
		test.each([
			// Hashes/second
			[412, UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND, '412 H/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND, '1 kH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND, '1.02 kH/s'],
			// Kilohashes/second
			[412, UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND, '412 kH/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND, '1 MH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND, '1.02 MH/s'],
			// Megahashes/second
			[412, UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND, '412 MH/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND, '1 GH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND, '1.02 GH/s'],
			// Gigahashes/second
			[412, UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND, '412 GH/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND, '1 TH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND, '1.02 TH/s'],
			// Terahashes/second
			[412, UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND, '412 TH/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND, '1 PH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND, '1.02 PH/s'],
			// Petahashes/second
			[412, UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND, '412 PH/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND, '1 EH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND, '1.02 EH/s'],
			// Exahashes/second
			[412, UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND, '412 EH/s'],
			[1000, UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND, '1 ZH/s'],
			[1023, UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND, '1.02 ZH/s'],
		])('formats hash rate value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Miscellaneous', () => {
		test.each([
			[742, UniversalYAxisUnit.MISC_STRING, '742'],
			[688, UniversalYAxisUnit.MISC_SHORT, '688'],
			[555, UniversalYAxisUnit.MISC_HUMIDITY, '555 %H'],
			[812, UniversalYAxisUnit.MISC_DECIBEL, '812 dB'],
			[1024, UniversalYAxisUnit.MISC_HEXADECIMAL, '400'],
			[1024, UniversalYAxisUnit.MISC_HEXADECIMAL_0X, '0x400'],
			[900, UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION, '9e+2'],
			[678, UniversalYAxisUnit.MISC_LOCALE_FORMAT, '678'],
			[444, UniversalYAxisUnit.MISC_PIXELS, '444 px'],
		])('formats miscellaneous value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Acceleration', () => {
		test.each([
			[
				875,
				UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED,
				'875 m/sec²',
			],
			[640, UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED, '640 f/sec²'],
			[512, UniversalYAxisUnit.ACCELERATION_G_UNIT, '512 g'],
			[
				2500,
				UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED,
				'2500 m/sec²',
			],
		])('formats acceleration value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Angular', () => {
		test.each([
			[415, UniversalYAxisUnit.ANGULAR_DEGREE, '415 °'],
			[732, UniversalYAxisUnit.ANGULAR_RADIAN, '732 rad'],
			[128, UniversalYAxisUnit.ANGULAR_GRADIAN, '128 grad'],
			[560, UniversalYAxisUnit.ANGULAR_ARC_MINUTE, '560 arcmin'],
			[945, UniversalYAxisUnit.ANGULAR_ARC_SECOND, '945 arcsec'],
		])('formats angular value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Area', () => {
		test.each([
			[210, UniversalYAxisUnit.AREA_SQUARE_METERS, '210 m²'],
			[152, UniversalYAxisUnit.AREA_SQUARE_FEET, '152 ft²'],
			[64, UniversalYAxisUnit.AREA_SQUARE_MILES, '64 mi²'],
		])('formats area value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('FLOPs', () => {
		test.each([
			// FLOPS
			[150, UniversalYAxisUnit.FLOPS_FLOPS, '150 FLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_FLOPS, '1 kFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_FLOPS, '1.08 kFLOPS'],
			// MFLOPS
			[275, UniversalYAxisUnit.FLOPS_MFLOPS, '275 MFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_MFLOPS, '1 GFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_MFLOPS, '1.08 GFLOPS'],
			// GFLOPS
			[640, UniversalYAxisUnit.FLOPS_GFLOPS, '640 GFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_GFLOPS, '1 TFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_GFLOPS, '1.08 TFLOPS'],
			// TFLOPS
			[875, UniversalYAxisUnit.FLOPS_TFLOPS, '875 TFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_TFLOPS, '1 PFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_TFLOPS, '1.08 PFLOPS'],
			// PFLOPS
			[430, UniversalYAxisUnit.FLOPS_PFLOPS, '430 PFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_PFLOPS, '1 EFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_PFLOPS, '1.08 EFLOPS'],
			// EFLOPS
			[590, UniversalYAxisUnit.FLOPS_EFLOPS, '590 EFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_EFLOPS, '1 ZFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_EFLOPS, '1.08 ZFLOPS'],
			// ZFLOPS
			[715, UniversalYAxisUnit.FLOPS_ZFLOPS, '715 ZFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_ZFLOPS, '1 YFLOPS'],
			[1080, UniversalYAxisUnit.FLOPS_ZFLOPS, '1.08 YFLOPS'],
			// YFLOPS
			[840, UniversalYAxisUnit.FLOPS_YFLOPS, '840 YFLOPS'],
			[1000, UniversalYAxisUnit.FLOPS_YFLOPS, '1000 YFLOPS'],
		])('formats FLOPs value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Concentration', () => {
		test.each([
			[415, UniversalYAxisUnit.CONCENTRATION_PPM, '415 ppm'],
			[1000, UniversalYAxisUnit.CONCENTRATION_PPM, '1000 ppm'],
			[732, UniversalYAxisUnit.CONCENTRATION_PPB, '732 ppb'],
			[1000, UniversalYAxisUnit.CONCENTRATION_PPB, '1000 ppb'],
			[128, UniversalYAxisUnit.CONCENTRATION_NG_M3, '128 ng/m³'],
			[1000, UniversalYAxisUnit.CONCENTRATION_NG_M3, '1000 ng/m³'],
			[560, UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER, '560 ng/Nm³'],
			[
				1000,
				UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER,
				'1000 ng/Nm³',
			],
			[945, UniversalYAxisUnit.CONCENTRATION_UG_M3, '945 μg/m³'],
			[1000, UniversalYAxisUnit.CONCENTRATION_UG_M3, '1000 μg/m³'],
			[210, UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER, '210 μg/Nm³'],
			[
				1000,
				UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER,
				'1000 μg/Nm³',
			],
			[152, UniversalYAxisUnit.CONCENTRATION_MG_M3, '152 mg/m³'],
			[64, UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER, '64 mg/Nm³'],
			[508, UniversalYAxisUnit.CONCENTRATION_G_M3, '508 g/m³'],
			[1000, UniversalYAxisUnit.CONCENTRATION_G_M3, '1000 g/m³'],
			[377, UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER, '377 g/Nm³'],
			[1000, UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER, '1000 g/Nm³'],
			[286, UniversalYAxisUnit.CONCENTRATION_MG_PER_DL, '286 mg/dL'],
			[1000, UniversalYAxisUnit.CONCENTRATION_MG_PER_DL, '1000 mg/dL'],
			[675, UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L, '675 mmol/L'],
			[1000, UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L, '1000 mmol/L'],
		])('formats concentration value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Currency', () => {
		test.each([
			[812, UniversalYAxisUnit.CURRENCY_USD, '$812'],
			[645, UniversalYAxisUnit.CURRENCY_GBP, '£645'],
			[731, UniversalYAxisUnit.CURRENCY_EUR, '€731'],
			[508, UniversalYAxisUnit.CURRENCY_JPY, '¥508'],
			[963, UniversalYAxisUnit.CURRENCY_RUB, '₽963'],
			[447, UniversalYAxisUnit.CURRENCY_UAH, '₴447'],
			[592, UniversalYAxisUnit.CURRENCY_BRL, 'R$592'],
			[375, UniversalYAxisUnit.CURRENCY_DKK, '375kr'],
			[418, UniversalYAxisUnit.CURRENCY_ISK, '418kr'],
			[536, UniversalYAxisUnit.CURRENCY_NOK, '536kr'],
			[689, UniversalYAxisUnit.CURRENCY_SEK, '689kr'],
			[724, UniversalYAxisUnit.CURRENCY_CZK, 'czk724'],
			[381, UniversalYAxisUnit.CURRENCY_CHF, 'CHF381'],
			[267, UniversalYAxisUnit.CURRENCY_PLN, 'PLN267'],
			[154, UniversalYAxisUnit.CURRENCY_BTC, '฿154'],
			[999, UniversalYAxisUnit.CURRENCY_MBTC, 'mBTC999'],
			[423, UniversalYAxisUnit.CURRENCY_UBTC, 'μBTC423'],
			[611, UniversalYAxisUnit.CURRENCY_ZAR, 'R611'],
			[782, UniversalYAxisUnit.CURRENCY_INR, '₹782'],
			[834, UniversalYAxisUnit.CURRENCY_KRW, '₩834'],
			[455, UniversalYAxisUnit.CURRENCY_IDR, 'Rp455'],
			[978, UniversalYAxisUnit.CURRENCY_PHP, 'PHP978'],
			[366, UniversalYAxisUnit.CURRENCY_VND, '366đ'],
		])('formats currency value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Datetime', () => {
		it('formats datetime units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.DATETIME_FROM_NOW)).toBe(
				'56 years ago',
			);
		});
	});

	describe('Power/Electrical', () => {
		test.each([
			[715, UniversalYAxisUnit.POWER_WATT, '715 W'],
			[1000, UniversalYAxisUnit.POWER_WATT, '1 kW'],
			[1080, UniversalYAxisUnit.POWER_WATT, '1.08 kW'],
			[438, UniversalYAxisUnit.POWER_KILOWATT, '438 kW'],
			[1000, UniversalYAxisUnit.POWER_KILOWATT, '1 MW'],
			[1080, UniversalYAxisUnit.POWER_KILOWATT, '1.08 MW'],
			[582, UniversalYAxisUnit.POWER_MEGAWATT, '582 MW'],
			[1000, UniversalYAxisUnit.POWER_MEGAWATT, '1 GW'],
			[1080, UniversalYAxisUnit.POWER_MEGAWATT, '1.08 GW'],
			[267, UniversalYAxisUnit.POWER_GIGAWATT, '267 GW'],
			[853, UniversalYAxisUnit.POWER_MILLIWATT, '853 mW'],
			[693, UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER, '693 W/m²'],
			[544, UniversalYAxisUnit.POWER_VOLT_AMPERE, '544 VA'],
			[812, UniversalYAxisUnit.POWER_KILOVOLT_AMPERE, '812 kVA'],
			[478, UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE, '478 VAr'],
			[365, UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE, '365 kVAr'],
			[629, UniversalYAxisUnit.POWER_WATT_HOUR, '629 Wh'],
			[471, UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG, '471 Wh/kg'],
			[557, UniversalYAxisUnit.POWER_KILOWATT_HOUR, '557 kWh'],
			[389, UniversalYAxisUnit.POWER_KILOWATT_MINUTE, '389 kW-Min'],
			[642, UniversalYAxisUnit.POWER_AMPERE_HOUR, '642 Ah'],
			[731, UniversalYAxisUnit.POWER_KILOAMPERE_HOUR, '731 kAh'],
			[815, UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR, '815 mAh'],
			[963, UniversalYAxisUnit.POWER_JOULE, '963 J'],
			[506, UniversalYAxisUnit.POWER_ELECTRON_VOLT, '506 eV'],
			[298, UniversalYAxisUnit.POWER_AMPERE, '298 A'],
			[654, UniversalYAxisUnit.POWER_KILOAMPERE, '654 kA'],
			[187, UniversalYAxisUnit.POWER_MILLIAMPERE, '187 mA'],
			[472, UniversalYAxisUnit.POWER_VOLT, '472 V'],
			[538, UniversalYAxisUnit.POWER_KILOVOLT, '538 kV'],
			[226, UniversalYAxisUnit.POWER_MILLIVOLT, '226 mV'],
			[592, UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT, '592 dBm'],
			[333, UniversalYAxisUnit.POWER_OHM, '333 Ω'],
			[447, UniversalYAxisUnit.POWER_KILOOHM, '447 kΩ'],
			[781, UniversalYAxisUnit.POWER_MEGAOHM, '781 MΩ'],
			[650, UniversalYAxisUnit.POWER_FARAD, '650 F'],
			[512, UniversalYAxisUnit.POWER_MICROFARAD, '512 µF'],
			[478, UniversalYAxisUnit.POWER_NANOFARAD, '478 nF'],
			[341, UniversalYAxisUnit.POWER_PICOFARAD, '341 pF'],
			[129, UniversalYAxisUnit.POWER_FEMTOFARAD, '129 fF'],
			[904, UniversalYAxisUnit.POWER_HENRY, '904 H'],
			[1000, UniversalYAxisUnit.POWER_HENRY, '1 kH'],
			[275, UniversalYAxisUnit.POWER_MILLIHENRY, '275 mH'],
			[618, UniversalYAxisUnit.POWER_MICROHENRY, '618 µH'],
			[1000, UniversalYAxisUnit.POWER_MICROHENRY, '1 mH'],
			[1080, UniversalYAxisUnit.POWER_MICROHENRY, '1.08 mH'],
			[459, UniversalYAxisUnit.POWER_LUMENS, '459 Lm'],
			[1000, UniversalYAxisUnit.POWER_LUMENS, '1 kLm'],
			[1080, UniversalYAxisUnit.POWER_LUMENS, '1.08 kLm'],
		])('formats power value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Flow', () => {
		test.each([
			[512, UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE, '512 gpm'],
			[1000, UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE, '1000 gpm'],
			[678, UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND, '678 cms'],
			[1000, UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND, '1000 cms'],
			[245, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND, '245 cfs'],
			[389, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE, '389 cfm'],
			[1000, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE, '1000 cfm'],
			[731, UniversalYAxisUnit.FLOW_LITERS_PER_HOUR, '731 L/h'],
			[1000, UniversalYAxisUnit.FLOW_LITERS_PER_HOUR, '1000 L/h'],
			[864, UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE, '864 L/min'],
			[1000, UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE, '1000 L/min'],
			[150, UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE, '150 mL/min'],
			[1000, UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE, '1000 mL/min'],
			[947, UniversalYAxisUnit.FLOW_LUX, '947 lux'],
			[1000, UniversalYAxisUnit.FLOW_LUX, '1000 lux'],
		])('formats flow value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Force', () => {
		test.each([
			[845, UniversalYAxisUnit.FORCE_NEWTON_METERS, '845 Nm'],
			[1000, UniversalYAxisUnit.FORCE_NEWTON_METERS, '1 kNm'],
			[1080, UniversalYAxisUnit.FORCE_NEWTON_METERS, '1.08 kNm'],
			[268, UniversalYAxisUnit.FORCE_KILONEWTON_METERS, '268 kNm'],
			[1000, UniversalYAxisUnit.FORCE_KILONEWTON_METERS, '1 MNm'],
			[1080, UniversalYAxisUnit.FORCE_KILONEWTON_METERS, '1.08 MNm'],
			[593, UniversalYAxisUnit.FORCE_NEWTONS, '593 N'],
			[1000, UniversalYAxisUnit.FORCE_KILONEWTONS, '1 MN'],
			[1080, UniversalYAxisUnit.FORCE_KILONEWTONS, '1.08 MN'],
		])('formats force value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Mass', () => {
		test.each([
			[120, UniversalYAxisUnit.MASS_MILLIGRAM, '120 mg'],
			[120000, UniversalYAxisUnit.MASS_MILLIGRAM, '120 g'],
			[987, UniversalYAxisUnit.MASS_GRAM, '987 g'],
			[1020, UniversalYAxisUnit.MASS_GRAM, '1.02 kg'],
			[456, UniversalYAxisUnit.MASS_POUND, '456 lb'],
			[321, UniversalYAxisUnit.MASS_KILOGRAM, '321 kg'],
			[654, UniversalYAxisUnit.MASS_METRIC_TON, '654 t'],
		])('formats mass value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Length', () => {
		test.each([
			[88, UniversalYAxisUnit.LENGTH_MILLIMETER, '88 mm'],
			[100, UniversalYAxisUnit.LENGTH_MILLIMETER, '100 mm'],
			[1000, UniversalYAxisUnit.LENGTH_MILLIMETER, '1 m'],
			[177, UniversalYAxisUnit.LENGTH_INCH, '177 in'],
			[266, UniversalYAxisUnit.LENGTH_FOOT, '266 ft'],
			[355, UniversalYAxisUnit.LENGTH_METER, '355 m'],
			[355000, UniversalYAxisUnit.LENGTH_METER, '355 km'],
			[444, UniversalYAxisUnit.LENGTH_KILOMETER, '444 km'],
			[533, UniversalYAxisUnit.LENGTH_MILE, '533 mi'],
		])('formats length value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Pressure', () => {
		test.each([
			[45, UniversalYAxisUnit.PRESSURE_MILLIBAR, '45 mbar'],
			[1013, UniversalYAxisUnit.PRESSURE_MILLIBAR, '1.01 bar'],
			[27, UniversalYAxisUnit.PRESSURE_BAR, '27 bar'],
			[62, UniversalYAxisUnit.PRESSURE_KILOBAR, '62 kbar'],
			[845, UniversalYAxisUnit.PRESSURE_PASCAL, '845 Pa'],
			[540, UniversalYAxisUnit.PRESSURE_HECTOPASCAL, '540 hPa'],
			[378, UniversalYAxisUnit.PRESSURE_KILOPASCAL, '378 kPa'],
			[29, UniversalYAxisUnit.PRESSURE_INCHES_HG, '29 "Hg'],
			[65, UniversalYAxisUnit.PRESSURE_PSI, '65psi'],
		])('formats pressure value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Radiation', () => {
		test.each([
			[452, UniversalYAxisUnit.RADIATION_BECQUEREL, '452 Bq'],
			[37, UniversalYAxisUnit.RADIATION_CURIE, '37 Ci'],
			[128, UniversalYAxisUnit.RADIATION_GRAY, '128 Gy'],
			[512, UniversalYAxisUnit.RADIATION_RAD, '512 rad'],
			[256, UniversalYAxisUnit.RADIATION_SIEVERT, '256 Sv'],
			[640, UniversalYAxisUnit.RADIATION_MILLISIEVERT, '640 mSv'],
			[875, UniversalYAxisUnit.RADIATION_MICROSIEVERT, '875 µSv'],
			[875000, UniversalYAxisUnit.RADIATION_MICROSIEVERT, '875 mSv'],
			[92, UniversalYAxisUnit.RADIATION_REM, '92 rem'],
			[715, UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG, '715 C/kg'],
			[833, UniversalYAxisUnit.RADIATION_ROENTGEN, '833 R'],
			[468, UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR, '468 Sv/h'],
			[590, UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR, '590 mSv/h'],
			[712, UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR, '712 µSv/h'],
		])('formats radiation value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Rotation Speed', () => {
		test.each([
			[345, UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE, '345 rpm'],
			[789, UniversalYAxisUnit.ROTATION_SPEED_HERTZ, '789 Hz'],
			[789000, UniversalYAxisUnit.ROTATION_SPEED_HERTZ, '789 kHz'],
			[213, UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND, '213 rad/s'],
			[654, UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND, '654 °/s'],
		])('formats rotation speed value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Temperature', () => {
		test.each([
			[37, UniversalYAxisUnit.TEMPERATURE_CELSIUS, '37 °C'],
			[451, UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT, '451 °F'],
			[310, UniversalYAxisUnit.TEMPERATURE_KELVIN, '310 K'],
		])('formats temperature value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Velocity', () => {
		test.each([
			[900, UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND, '900 m/s'],
			[456, UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR, '456 km/h'],
			[789, UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR, '789 mph'],
			[222, UniversalYAxisUnit.VELOCITY_KNOT, '222 kn'],
		])('formats velocity value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Volume', () => {
		test.each([
			[1200, UniversalYAxisUnit.VOLUME_MILLILITER, '1.2 L'],
			[9000000, UniversalYAxisUnit.VOLUME_MILLILITER, '9 kL'],
			[9, UniversalYAxisUnit.VOLUME_LITER, '9 L'],
			[9000, UniversalYAxisUnit.VOLUME_LITER, '9 kL'],
			[9000000, UniversalYAxisUnit.VOLUME_LITER, '9 ML'],
			[9000000000, UniversalYAxisUnit.VOLUME_LITER, '9 GL'],
			[9000000000000, UniversalYAxisUnit.VOLUME_LITER, '9 TL'],
			[9000000000000000, UniversalYAxisUnit.VOLUME_LITER, '9 PL'],
			[9010000000000000000, UniversalYAxisUnit.VOLUME_LITER, '9.01 EL'],
			[9020000000000000000000, UniversalYAxisUnit.VOLUME_LITER, '9.02 ZL'],
			[9030000000000000000000000, UniversalYAxisUnit.VOLUME_LITER, '9.03 YL'],
			[900, UniversalYAxisUnit.VOLUME_CUBIC_METER, '900 m³'],
			[
				9000000000000000000000000000000,
				UniversalYAxisUnit.VOLUME_CUBIC_METER,
				'9e+30 m³',
			],
			[900, UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER, '900 Nm³'],
			[
				9000000000000000000000000000000,
				UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER,
				'9e+30 Nm³',
			],
			[900, UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER, '900 dm³'],
			[
				9000000000000000000000000000000,
				UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER,
				'9e+30 dm³',
			],
			[900, UniversalYAxisUnit.VOLUME_GALLON, '900 gal'],
			[
				9000000000000000000000000000000,
				UniversalYAxisUnit.VOLUME_GALLON,
				'9e+30 gal',
			],
		])('formats volume value %s %s as %s', (value, unit, expected) => {
			expect(formatUniversalUnit(value, unit)).toBe(expected);
		});
	});

	describe('Boolean', () => {
		it('formats boolean units', () => {
			expect(formatUniversalUnit(1, UniversalYAxisUnit.TRUE_FALSE)).toBe('True');
			expect(formatUniversalUnit(1, UniversalYAxisUnit.YES_NO)).toBe('Yes');
			expect(formatUniversalUnit(1, UniversalYAxisUnit.ON_OFF)).toBe('On');
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
					throw new Error(`Unit ${unit} does not have a mapping`);
				}
				return hasMapping;
			}),
		).toBe(true);
	});
});

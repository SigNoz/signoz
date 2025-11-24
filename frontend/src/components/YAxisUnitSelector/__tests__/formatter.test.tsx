import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import {
	AdditionalLabelsMappingForGrafanaUnits,
	UniversalUnitToGrafanaUnit,
} from '../constants';
import { formatUniversalUnit } from '../formatter';

const VALUE_BELOW_THRESHOLD = 864;

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
			).toBe('864 B');
			expect(formatUniversalUnit(512, UniversalYAxisUnit.KILOBYTES)).toBe(
				'512 kB',
			);
			expect(formatUniversalUnit(777, UniversalYAxisUnit.MEGABYTES)).toBe(
				'777 MB',
			);
			expect(formatUniversalUnit(432, UniversalYAxisUnit.GIGABYTES)).toBe(
				'432 GB',
			);
			expect(formatUniversalUnit(678, UniversalYAxisUnit.TERABYTES)).toBe(
				'678 TB',
			);
			expect(formatUniversalUnit(845, UniversalYAxisUnit.PETABYTES)).toBe(
				'845 PB',
			);
			expect(formatUniversalUnit(921, UniversalYAxisUnit.EXABYTES)).toBe('921 EB');
			expect(formatUniversalUnit(118, UniversalYAxisUnit.ZETTABYTES)).toBe(
				'118 ZB',
			);
			expect(formatUniversalUnit(645, UniversalYAxisUnit.YOTTABYTES)).toBe(
				'645 YB',
			);
			expect(formatUniversalUnit(999, UniversalYAxisUnit.BITS_IEC)).toBe('999 b');
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
			expect(formatUniversalUnit(1024, UniversalYAxisUnit.BITS_IEC)).toBe('1 Kib');
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
			expect(formatUniversalUnit(480, UniversalYAxisUnit.BYTES_SECOND)).toBe(
				'480 B/s',
			);
			expect(formatUniversalUnit(650, UniversalYAxisUnit.KILOBYTES_SECOND)).toBe(
				'650 kB/s',
			);
			expect(formatUniversalUnit(725, UniversalYAxisUnit.MEGABYTES_SECOND)).toBe(
				'725 MB/s',
			);
			expect(formatUniversalUnit(860, UniversalYAxisUnit.GIGABYTES_SECOND)).toBe(
				'860 GB/s',
			);
			expect(formatUniversalUnit(995, UniversalYAxisUnit.TERABYTES_SECOND)).toBe(
				'995 TB/s',
			);
			expect(formatUniversalUnit(410, UniversalYAxisUnit.PETABYTES_SECOND)).toBe(
				'410 PB/s',
			);
			expect(formatUniversalUnit(312, UniversalYAxisUnit.EXABYTES_SECOND)).toBe(
				'312 EB/s',
			);
			expect(formatUniversalUnit(278, UniversalYAxisUnit.ZETTABYTES_SECOND)).toBe(
				'278 ZB/s',
			);
			expect(formatUniversalUnit(666, UniversalYAxisUnit.YOTTABYTES_SECOND)).toBe(
				'666 YB/s',
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
			expect(formatUniversalUnit(250, UniversalYAxisUnit.BITS)).toBe('250 b');
			expect(formatUniversalUnit(375, UniversalYAxisUnit.KILOBITS)).toBe('375 kb');
			expect(formatUniversalUnit(640, UniversalYAxisUnit.MEGABITS)).toBe('640 Mb');
			expect(formatUniversalUnit(875, UniversalYAxisUnit.GIGABITS)).toBe('875 Gb');
			expect(formatUniversalUnit(430, UniversalYAxisUnit.TERABITS)).toBe('430 Tb');
			expect(formatUniversalUnit(590, UniversalYAxisUnit.PETABITS)).toBe('590 Pb');
			expect(formatUniversalUnit(715, UniversalYAxisUnit.EXABITS)).toBe('715 Eb');
			expect(formatUniversalUnit(840, UniversalYAxisUnit.ZETTABITS)).toBe(
				'840 Zb',
			);
			expect(formatUniversalUnit(965, UniversalYAxisUnit.YOTTABITS)).toBe(
				'965 Yb',
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
			expect(formatUniversalUnit(512, UniversalYAxisUnit.BITS_SECOND)).toBe(
				'512 b/s',
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
			expect(formatUniversalUnit(875, UniversalYAxisUnit.COUNT)).toBe('875');
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
			expect(formatUniversalUnit(640, UniversalYAxisUnit.COUNT_SECOND)).toBe(
				'640 c/s',
			);
			expect(formatUniversalUnit(450, UniversalYAxisUnit.COUNT_MINUTE)).toBe(
				'450 c/m',
			);
		});
	});

	describe('Operations units', () => {
		it('formats operations per time', () => {
			expect(formatUniversalUnit(780, UniversalYAxisUnit.OPS_SECOND)).toBe(
				'780 ops/s',
			);
			expect(formatUniversalUnit(520, UniversalYAxisUnit.OPS_MINUTE)).toBe(
				'520 ops/m',
			);
		});
	});

	describe('Request units', () => {
		it('formats requests per time', () => {
			expect(formatUniversalUnit(615, UniversalYAxisUnit.REQUESTS_SECOND)).toBe(
				'615 req/s',
			);
			expect(formatUniversalUnit(480, UniversalYAxisUnit.REQUESTS_MINUTE)).toBe(
				'480 req/m',
			);
		});
	});

	describe('Read/Write units', () => {
		it('formats reads and writes per time', () => {
			expect(formatUniversalUnit(505, UniversalYAxisUnit.READS_SECOND)).toBe(
				'505 rd/s',
			);
			expect(formatUniversalUnit(610, UniversalYAxisUnit.WRITES_SECOND)).toBe(
				'610 wr/s',
			);
			expect(formatUniversalUnit(715, UniversalYAxisUnit.READS_MINUTE)).toBe(
				'715 rd/m',
			);
			expect(formatUniversalUnit(830, UniversalYAxisUnit.WRITES_MINUTE)).toBe(
				'830 wr/m',
			);
		});
	});

	describe('IO Operations units', () => {
		it('formats IOPS', () => {
			expect(formatUniversalUnit(777, UniversalYAxisUnit.IOOPS_SECOND)).toBe(
				'777 io/s',
			);
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
		it('formats duration units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.DURATION_MS)).toBe(
				'900 milliseconds',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.DURATION_S)).toBe(
				'15 minutes',
			);
			expect(formatUniversalUnit(90005, UniversalYAxisUnit.DURATION_HMS)).toBe(
				'25:00:05',
			);
			expect(formatUniversalUnit(90005, UniversalYAxisUnit.DURATION_DHMS)).toBe(
				'1 d 01:00:05',
			);
		});

		it('formats timeticks and clock units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TIMETICKS)).toBe('9 s');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CLOCK_MS)).toBe('900ms');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CLOCK_S)).toBe(
				'15m:00s:000ms',
			);
		});

		it('formats hertz', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TIME_HERTZ)).toBe(
				'900 Hz',
			);
		});
	});

	describe('Data (IEC/Binary)', () => {
		it('formats IEC bytes', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.BYTES_IEC)).toBe('900 B');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.KIBIBYTES)).toBe(
				'900 KiB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MEBIBYTES)).toBe(
				'900 MiB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.GIBIBYTES)).toBe(
				'900 GiB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TEBIBYTES)).toBe(
				'900 TiB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PEBIBYTES)).toBe(
				'900 PiB',
			);
		});

		it('formats high-order IEC bytes', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.EXBIBYTES)).toBe(
				'900 EiB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ZEBIBYTES)).toBe(
				'900 ZiB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.YOBIBYTES)).toBe(
				'900 YiB',
			);
		});
	});

	describe('Data Rate (IEC/Binary)', () => {
		it('formats IEC byte rates', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.KIBIBYTES_SECOND)).toBe(
				'900 KiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MEBIBYTES_SECOND)).toBe(
				'900 MiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.GIBIBYTES_SECOND)).toBe(
				'900 GiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TEBIBYTES_SECOND)).toBe(
				'900 TiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PEBIBYTES_SECOND)).toBe(
				'900 PiB/s',
			);
		});

		it('formats IEC bit rates', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.KIBIBITS_SECOND)).toBe(
				'900 Kib/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MEBIBITS_SECOND)).toBe(
				'900 Mib/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.GIBIBITS_SECOND)).toBe(
				'900 Gib/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TEBIBITS_SECOND)).toBe(
				'900 Tib/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PEBIBITS_SECOND)).toBe(
				'900 Pib/s',
			);
		});

		it('formats high-order IEC rates', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.EXBIBYTES_SECOND)).toBe(
				'900 EiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ZEBIBYTES_SECOND)).toBe(
				'900 ZiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.YOBIBYTES_SECOND)).toBe(
				'900 YiB/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.EXBIBITS_SECOND)).toBe(
				'900 Eibit/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ZEBIBITS_SECOND)).toBe(
				'900 Zibit/s',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.YOBIBITS_SECOND)).toBe(
				'900 Yibit/s',
			);
		});

		it('formats packets per second', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND),
			).toBe('900 p/s');
		});
	});

	describe('Bits (IEC)', () => {
		it('formats IEC bits', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.BITS_IEC)).toBe('900 b');
		});
	});

	describe('Hash Rate', () => {
		it('formats hash rate units', () => {
			expect(
				formatUniversalUnit(412, UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND),
			).toBe('412 H/s');
			expect(
				formatUniversalUnit(
					678,
					UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND,
				),
			).toBe('678 kH/s');
			expect(
				formatUniversalUnit(
					890,
					UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND,
				),
			).toBe('890 MH/s');
			expect(
				formatUniversalUnit(
					234,
					UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND,
				),
			).toBe('234 GH/s');
			expect(
				formatUniversalUnit(
					567,
					UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND,
				),
			).toBe('567 TH/s');
			expect(
				formatUniversalUnit(
					789,
					UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND,
				),
			).toBe('789 PH/s');
			expect(
				formatUniversalUnit(321, UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND),
			).toBe('321 EH/s');
		});
	});

	describe('Miscellaneous', () => {
		it('formats miscellaneous units', () => {
			expect(formatUniversalUnit(742, UniversalYAxisUnit.MISC_STRING)).toBe('742');
			expect(formatUniversalUnit(688, UniversalYAxisUnit.MISC_SHORT)).toBe('688');
			expect(formatUniversalUnit(555, UniversalYAxisUnit.MISC_HUMIDITY)).toBe(
				'555 %H',
			);
			expect(formatUniversalUnit(812, UniversalYAxisUnit.MISC_DECIBEL)).toBe(
				'812 dB',
			);
			expect(formatUniversalUnit(1024, UniversalYAxisUnit.MISC_HEXADECIMAL)).toBe(
				'400',
			);
			expect(
				formatUniversalUnit(1024, UniversalYAxisUnit.MISC_HEXADECIMAL_0X),
			).toBe('0x400');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION),
			).toBe('9e+2');
			expect(formatUniversalUnit(678, UniversalYAxisUnit.MISC_LOCALE_FORMAT)).toBe(
				'678',
			);
			expect(formatUniversalUnit(444, UniversalYAxisUnit.MISC_PIXELS)).toBe(
				'444 px',
			);
		});
	});

	describe('Acceleration', () => {
		it('formats acceleration units', () => {
			expect(
				formatUniversalUnit(
					875,
					UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED,
				),
			).toBe('875 m/sec²');
			expect(
				formatUniversalUnit(
					640,
					UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED,
				),
			).toBe('640 f/sec²');
			expect(
				formatUniversalUnit(512, UniversalYAxisUnit.ACCELERATION_G_UNIT),
			).toBe('512 g');
		});
	});

	describe('Angular', () => {
		it('formats angular units', () => {
			expect(formatUniversalUnit(415, UniversalYAxisUnit.ANGULAR_DEGREE)).toBe(
				'415 °',
			);
			expect(formatUniversalUnit(732, UniversalYAxisUnit.ANGULAR_RADIAN)).toBe(
				'732 rad',
			);
			expect(formatUniversalUnit(128, UniversalYAxisUnit.ANGULAR_GRADIAN)).toBe(
				'128 grad',
			);
			expect(formatUniversalUnit(560, UniversalYAxisUnit.ANGULAR_ARC_MINUTE)).toBe(
				'560 arcmin',
			);
			expect(formatUniversalUnit(945, UniversalYAxisUnit.ANGULAR_ARC_SECOND)).toBe(
				'945 arcsec',
			);
		});
	});

	describe('Area', () => {
		it('formats area units', () => {
			expect(formatUniversalUnit(210, UniversalYAxisUnit.AREA_SQUARE_METERS)).toBe(
				'210 m²',
			);
			expect(formatUniversalUnit(152, UniversalYAxisUnit.AREA_SQUARE_FEET)).toBe(
				'152 ft²',
			);
			expect(formatUniversalUnit(64, UniversalYAxisUnit.AREA_SQUARE_MILES)).toBe(
				'64 mi²',
			);
		});
	});

	describe('FLOPs', () => {
		it('formats FLOPs units', () => {
			expect(formatUniversalUnit(150, UniversalYAxisUnit.FLOPS_FLOPS)).toBe(
				'150 FLOPS',
			);
			expect(formatUniversalUnit(275, UniversalYAxisUnit.FLOPS_MFLOPS)).toBe(
				'275 MFLOPS',
			);
			expect(formatUniversalUnit(640, UniversalYAxisUnit.FLOPS_GFLOPS)).toBe(
				'640 GFLOPS',
			);
			expect(formatUniversalUnit(875, UniversalYAxisUnit.FLOPS_TFLOPS)).toBe(
				'875 TFLOPS',
			);
			expect(formatUniversalUnit(430, UniversalYAxisUnit.FLOPS_PFLOPS)).toBe(
				'430 PFLOPS',
			);
			expect(formatUniversalUnit(590, UniversalYAxisUnit.FLOPS_EFLOPS)).toBe(
				'590 EFLOPS',
			);
			expect(formatUniversalUnit(715, UniversalYAxisUnit.FLOPS_ZFLOPS)).toBe(
				'715 ZFLOPS',
			);
			expect(formatUniversalUnit(840, UniversalYAxisUnit.FLOPS_YFLOPS)).toBe(
				'840 YFLOPS',
			);
		});
	});

	describe('Concentration', () => {
		it('formats concentration units', () => {
			expect(formatUniversalUnit(415, UniversalYAxisUnit.CONCENTRATION_PPM)).toBe(
				'415 ppm',
			);
			expect(formatUniversalUnit(732, UniversalYAxisUnit.CONCENTRATION_PPB)).toBe(
				'732 ppb',
			);
			expect(
				formatUniversalUnit(128, UniversalYAxisUnit.CONCENTRATION_NG_M3),
			).toBe('128 ng/m³');
			expect(
				formatUniversalUnit(
					560,
					UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER,
				),
			).toBe('560 ng/Nm³');
			expect(
				formatUniversalUnit(945, UniversalYAxisUnit.CONCENTRATION_UG_M3),
			).toBe('945 μg/m³');
			expect(
				formatUniversalUnit(
					210,
					UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER,
				),
			).toBe('210 μg/Nm³');
			expect(
				formatUniversalUnit(152, UniversalYAxisUnit.CONCENTRATION_MG_M3),
			).toBe('152 mg/m³');
			expect(
				formatUniversalUnit(
					64,
					UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER,
				),
			).toBe('64 mg/Nm³');
			expect(formatUniversalUnit(508, UniversalYAxisUnit.CONCENTRATION_G_M3)).toBe(
				'508 g/m³',
			);
			expect(
				formatUniversalUnit(
					377,
					UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER,
				),
			).toBe('377 g/Nm³');
			expect(
				formatUniversalUnit(286, UniversalYAxisUnit.CONCENTRATION_MG_PER_DL),
			).toBe('286 mg/dL');
			expect(
				formatUniversalUnit(675, UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L),
			).toBe('675 mmol/L');
		});
	});

	describe('Currency', () => {
		it('formats currency units', () => {
			expect(formatUniversalUnit(812, UniversalYAxisUnit.CURRENCY_USD)).toBe(
				'$812',
			);
			expect(formatUniversalUnit(645, UniversalYAxisUnit.CURRENCY_GBP)).toBe(
				'£645',
			);
			expect(formatUniversalUnit(731, UniversalYAxisUnit.CURRENCY_EUR)).toBe(
				'€731',
			);
			expect(formatUniversalUnit(508, UniversalYAxisUnit.CURRENCY_JPY)).toBe(
				'¥508',
			);
			expect(formatUniversalUnit(963, UniversalYAxisUnit.CURRENCY_RUB)).toBe(
				'₽963',
			);
			expect(formatUniversalUnit(447, UniversalYAxisUnit.CURRENCY_UAH)).toBe(
				'₴447',
			);
			expect(formatUniversalUnit(592, UniversalYAxisUnit.CURRENCY_BRL)).toBe(
				'R$592',
			);
			expect(formatUniversalUnit(375, UniversalYAxisUnit.CURRENCY_DKK)).toBe(
				'375kr',
			);
			expect(formatUniversalUnit(418, UniversalYAxisUnit.CURRENCY_ISK)).toBe(
				'418kr',
			);
			expect(formatUniversalUnit(536, UniversalYAxisUnit.CURRENCY_NOK)).toBe(
				'536kr',
			);
			expect(formatUniversalUnit(689, UniversalYAxisUnit.CURRENCY_SEK)).toBe(
				'689kr',
			);
			expect(formatUniversalUnit(724, UniversalYAxisUnit.CURRENCY_CZK)).toBe(
				'czk724',
			);
			expect(formatUniversalUnit(381, UniversalYAxisUnit.CURRENCY_CHF)).toBe(
				'CHF381',
			);
			expect(formatUniversalUnit(267, UniversalYAxisUnit.CURRENCY_PLN)).toBe(
				'PLN267',
			);
			expect(formatUniversalUnit(154, UniversalYAxisUnit.CURRENCY_BTC)).toBe(
				'฿154',
			);
			expect(formatUniversalUnit(999, UniversalYAxisUnit.CURRENCY_MBTC)).toBe(
				'mBTC999',
			);
			expect(formatUniversalUnit(423, UniversalYAxisUnit.CURRENCY_UBTC)).toBe(
				'μBTC423',
			);
			expect(formatUniversalUnit(611, UniversalYAxisUnit.CURRENCY_ZAR)).toBe(
				'R611',
			);
			expect(formatUniversalUnit(782, UniversalYAxisUnit.CURRENCY_INR)).toBe(
				'₹782',
			);
			expect(formatUniversalUnit(834, UniversalYAxisUnit.CURRENCY_KRW)).toBe(
				'₩834',
			);
			expect(formatUniversalUnit(455, UniversalYAxisUnit.CURRENCY_IDR)).toBe(
				'Rp455',
			);
			expect(formatUniversalUnit(978, UniversalYAxisUnit.CURRENCY_PHP)).toBe(
				'PHP978',
			);
			expect(formatUniversalUnit(366, UniversalYAxisUnit.CURRENCY_VND)).toBe(
				'366đ',
			);
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
		it('formats power units', () => {
			expect(formatUniversalUnit(715, UniversalYAxisUnit.POWER_WATT)).toBe(
				'715 W',
			);
			expect(formatUniversalUnit(438, UniversalYAxisUnit.POWER_KILOWATT)).toBe(
				'438 kW',
			);
			expect(formatUniversalUnit(582, UniversalYAxisUnit.POWER_MEGAWATT)).toBe(
				'582 MW',
			);
			expect(formatUniversalUnit(267, UniversalYAxisUnit.POWER_GIGAWATT)).toBe(
				'267 GW',
			);
			expect(formatUniversalUnit(853, UniversalYAxisUnit.POWER_MILLIWATT)).toBe(
				'853 mW',
			);
			expect(
				formatUniversalUnit(693, UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER),
			).toBe('693 W/m²');
			expect(formatUniversalUnit(544, UniversalYAxisUnit.POWER_VOLT_AMPERE)).toBe(
				'544 VA',
			);
			expect(
				formatUniversalUnit(812, UniversalYAxisUnit.POWER_KILOVOLT_AMPERE),
			).toBe('812 kVA');
			expect(
				formatUniversalUnit(478, UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE),
			).toBe('478 VAr');
			expect(
				formatUniversalUnit(365, UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE),
			).toBe('365 kVAr');
			expect(formatUniversalUnit(629, UniversalYAxisUnit.POWER_WATT_HOUR)).toBe(
				'629 Wh',
			);
			expect(
				formatUniversalUnit(471, UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG),
			).toBe('471 Wh/kg');
			expect(
				formatUniversalUnit(557, UniversalYAxisUnit.POWER_KILOWATT_HOUR),
			).toBe('557 kWh');
			expect(
				formatUniversalUnit(389, UniversalYAxisUnit.POWER_KILOWATT_MINUTE),
			).toBe('389 kW-Min');
			expect(formatUniversalUnit(642, UniversalYAxisUnit.POWER_AMPERE_HOUR)).toBe(
				'642 Ah',
			);
			expect(
				formatUniversalUnit(731, UniversalYAxisUnit.POWER_KILOAMPERE_HOUR),
			).toBe('731 kAh');
			expect(
				formatUniversalUnit(815, UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR),
			).toBe('815 mAh');
			expect(formatUniversalUnit(963, UniversalYAxisUnit.POWER_JOULE)).toBe(
				'963 J',
			);
			expect(
				formatUniversalUnit(506, UniversalYAxisUnit.POWER_ELECTRON_VOLT),
			).toBe('506 eV');
			expect(formatUniversalUnit(298, UniversalYAxisUnit.POWER_AMPERE)).toBe(
				'298 A',
			);
			expect(formatUniversalUnit(654, UniversalYAxisUnit.POWER_KILOAMPERE)).toBe(
				'654 kA',
			);
			expect(formatUniversalUnit(187, UniversalYAxisUnit.POWER_MILLIAMPERE)).toBe(
				'187 mA',
			);
			expect(formatUniversalUnit(472, UniversalYAxisUnit.POWER_VOLT)).toBe(
				'472 V',
			);
			expect(formatUniversalUnit(538, UniversalYAxisUnit.POWER_KILOVOLT)).toBe(
				'538 kV',
			);
			expect(formatUniversalUnit(226, UniversalYAxisUnit.POWER_MILLIVOLT)).toBe(
				'226 mV',
			);
			expect(
				formatUniversalUnit(592, UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT),
			).toBe('592 dBm');
			expect(formatUniversalUnit(333, UniversalYAxisUnit.POWER_OHM)).toBe('333 Ω');
			expect(formatUniversalUnit(447, UniversalYAxisUnit.POWER_KILOOHM)).toBe(
				'447 kΩ',
			);
			expect(formatUniversalUnit(781, UniversalYAxisUnit.POWER_MEGAOHM)).toBe(
				'781 MΩ',
			);
			expect(formatUniversalUnit(650, UniversalYAxisUnit.POWER_FARAD)).toBe(
				'650 F',
			);
			expect(formatUniversalUnit(512, UniversalYAxisUnit.POWER_MICROFARAD)).toBe(
				'512 µF',
			);
			expect(formatUniversalUnit(478, UniversalYAxisUnit.POWER_NANOFARAD)).toBe(
				'478 nF',
			);
			expect(formatUniversalUnit(341, UniversalYAxisUnit.POWER_PICOFARAD)).toBe(
				'341 pF',
			);
			expect(formatUniversalUnit(129, UniversalYAxisUnit.POWER_FEMTOFARAD)).toBe(
				'129 fF',
			);
			expect(formatUniversalUnit(904, UniversalYAxisUnit.POWER_HENRY)).toBe(
				'904 H',
			);
			expect(formatUniversalUnit(275, UniversalYAxisUnit.POWER_MILLIHENRY)).toBe(
				'275 mH',
			);
			expect(formatUniversalUnit(618, UniversalYAxisUnit.POWER_MICROHENRY)).toBe(
				'618 µH',
			);
			expect(formatUniversalUnit(459, UniversalYAxisUnit.POWER_LUMENS)).toBe(
				'459 Lm',
			);
		});
	});

	describe('Flow', () => {
		it('formats flow units', () => {
			expect(
				formatUniversalUnit(512, UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE),
			).toBe('512 gpm');
			expect(
				formatUniversalUnit(678, UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND),
			).toBe('678 cms');
			expect(
				formatUniversalUnit(245, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND),
			).toBe('245 cfs');
			expect(
				formatUniversalUnit(389, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE),
			).toBe('389 cfm');
			expect(
				formatUniversalUnit(731, UniversalYAxisUnit.FLOW_LITERS_PER_HOUR),
			).toBe('731 L/h');
			expect(
				formatUniversalUnit(864, UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE),
			).toBe('864 L/min');
			expect(
				formatUniversalUnit(150, UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE),
			).toBe('150 mL/min');
			expect(formatUniversalUnit(947, UniversalYAxisUnit.FLOW_LUX)).toBe(
				'947 lux',
			);
		});
	});

	describe('Force', () => {
		it('formats force units', () => {
			expect(
				formatUniversalUnit(845, UniversalYAxisUnit.FORCE_NEWTON_METERS),
			).toBe('845 Nm');
			expect(
				formatUniversalUnit(268, UniversalYAxisUnit.FORCE_KILONEWTON_METERS),
			).toBe('268 kNm');
			expect(formatUniversalUnit(593, UniversalYAxisUnit.FORCE_NEWTONS)).toBe(
				'593 N',
			);
			expect(formatUniversalUnit(412, UniversalYAxisUnit.FORCE_KILONEWTONS)).toBe(
				'412 kN',
			);
		});
	});

	describe('Mass', () => {
		it('formats mass units', () => {
			expect(formatUniversalUnit(120, UniversalYAxisUnit.MASS_MILLIGRAM)).toBe(
				'120 mg',
			);
			expect(formatUniversalUnit(987, UniversalYAxisUnit.MASS_GRAM)).toBe('987 g');
			expect(formatUniversalUnit(456, UniversalYAxisUnit.MASS_POUND)).toBe(
				'456 lb',
			);
			expect(formatUniversalUnit(321, UniversalYAxisUnit.MASS_KILOGRAM)).toBe(
				'321 kg',
			);
			expect(formatUniversalUnit(654, UniversalYAxisUnit.MASS_METRIC_TON)).toBe(
				'654 t',
			);
		});
	});

	describe('Length', () => {
		it('formats length units', () => {
			expect(formatUniversalUnit(88, UniversalYAxisUnit.LENGTH_MILLIMETER)).toBe(
				'88 mm',
			);
			expect(formatUniversalUnit(177, UniversalYAxisUnit.LENGTH_INCH)).toBe(
				'177 in',
			);
			expect(formatUniversalUnit(266, UniversalYAxisUnit.LENGTH_FOOT)).toBe(
				'266 ft',
			);
			expect(formatUniversalUnit(355, UniversalYAxisUnit.LENGTH_METER)).toBe(
				'355 m',
			);
			expect(formatUniversalUnit(444, UniversalYAxisUnit.LENGTH_KILOMETER)).toBe(
				'444 km',
			);
			expect(formatUniversalUnit(533, UniversalYAxisUnit.LENGTH_MILE)).toBe(
				'533 mi',
			);
		});
	});

	describe('Pressure', () => {
		it('formats pressure units', () => {
			expect(formatUniversalUnit(45, UniversalYAxisUnit.PRESSURE_MILLIBAR)).toBe(
				'45 mbar',
			);
			expect(formatUniversalUnit(1013, UniversalYAxisUnit.PRESSURE_MILLIBAR)).toBe(
				'1.01 bar',
			);
			expect(formatUniversalUnit(27, UniversalYAxisUnit.PRESSURE_BAR)).toBe(
				'27 bar',
			);
			expect(formatUniversalUnit(62, UniversalYAxisUnit.PRESSURE_KILOBAR)).toBe(
				'62 kbar',
			);
			expect(formatUniversalUnit(845, UniversalYAxisUnit.PRESSURE_PASCAL)).toBe(
				'845 Pa',
			);
			expect(
				formatUniversalUnit(540, UniversalYAxisUnit.PRESSURE_HECTOPASCAL),
			).toBe('540 hPa');
			expect(
				formatUniversalUnit(378, UniversalYAxisUnit.PRESSURE_KILOPASCAL),
			).toBe('378 kPa');
			expect(formatUniversalUnit(29, UniversalYAxisUnit.PRESSURE_INCHES_HG)).toBe(
				'29 "Hg',
			);
			expect(formatUniversalUnit(65, UniversalYAxisUnit.PRESSURE_PSI)).toBe(
				'65psi',
			);
		});
	});

	describe('Radiation', () => {
		it('formats radiation units', () => {
			expect(
				formatUniversalUnit(452, UniversalYAxisUnit.RADIATION_BECQUEREL),
			).toBe('452 Bq');
			expect(formatUniversalUnit(37, UniversalYAxisUnit.RADIATION_CURIE)).toBe(
				'37 Ci',
			);
			expect(formatUniversalUnit(128, UniversalYAxisUnit.RADIATION_GRAY)).toBe(
				'128 Gy',
			);
			expect(formatUniversalUnit(512, UniversalYAxisUnit.RADIATION_RAD)).toBe(
				'512 rad',
			);
			expect(formatUniversalUnit(256, UniversalYAxisUnit.RADIATION_SIEVERT)).toBe(
				'256 Sv',
			);
			expect(
				formatUniversalUnit(640, UniversalYAxisUnit.RADIATION_MILLISIEVERT),
			).toBe('640 mSv');
			expect(
				formatUniversalUnit(875, UniversalYAxisUnit.RADIATION_MICROSIEVERT),
			).toBe('875 µSv');
			expect(formatUniversalUnit(92, UniversalYAxisUnit.RADIATION_REM)).toBe(
				'92 rem',
			);
			expect(
				formatUniversalUnit(715, UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG),
			).toBe('715 C/kg');
			expect(formatUniversalUnit(833, UniversalYAxisUnit.RADIATION_ROENTGEN)).toBe(
				'833 R',
			);
			expect(
				formatUniversalUnit(468, UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR),
			).toBe('468 Sv/h');
			expect(
				formatUniversalUnit(
					590,
					UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR,
				),
			).toBe('590 mSv/h');
			expect(
				formatUniversalUnit(
					712,
					UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR,
				),
			).toBe('712 µSv/h');
		});
	});

	describe('Rotation Speed', () => {
		it('formats rotation speed units', () => {
			expect(
				formatUniversalUnit(
					345,
					UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE,
				),
			).toBe('345 rpm');
			expect(
				formatUniversalUnit(789, UniversalYAxisUnit.ROTATION_SPEED_HERTZ),
			).toBe('789 Hz');
			expect(
				formatUniversalUnit(
					213,
					UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND,
				),
			).toBe('213 rad/s');
			expect(
				formatUniversalUnit(
					654,
					UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND,
				),
			).toBe('654 °/s');
		});
	});

	describe('Temperature', () => {
		it('formats temperature units', () => {
			expect(formatUniversalUnit(37, UniversalYAxisUnit.TEMPERATURE_CELSIUS)).toBe(
				'37 °C',
			);
			expect(
				formatUniversalUnit(451, UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT),
			).toBe('451 °F');
			expect(formatUniversalUnit(310, UniversalYAxisUnit.TEMPERATURE_KELVIN)).toBe(
				'310 K',
			);
		});
	});

	describe('Velocity', () => {
		it('formats velocity units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND),
			).toBe('900 m/s');
			expect(
				formatUniversalUnit(456, UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR),
			).toBe('456 km/h');
			expect(
				formatUniversalUnit(789, UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR),
			).toBe('789 mph');
			expect(formatUniversalUnit(222, UniversalYAxisUnit.VELOCITY_KNOT)).toBe(
				'222 kn',
			);
		});
	});

	describe('Volume', () => {
		it('formats volume units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.VOLUME_MILLILITER)).toBe(
				'900 mL',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.VOLUME_LITER)).toBe(
				'900 L',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.VOLUME_CUBIC_METER)).toBe(
				'900 m³',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER),
			).toBe('900 Nm³');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER),
			).toBe('900 dm³');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.VOLUME_GALLON)).toBe(
				'900 gal',
			);
		});
	});

	describe('Boolean', () => {
		it('formats boolean units', () => {
			expect(formatUniversalUnit(1, UniversalYAxisUnit.TRUE_FALSE)).toBe('True');
			expect(formatUniversalUnit(1, UniversalYAxisUnit.YES_NO)).toBe('Yes');
			expect(formatUniversalUnit(1, UniversalYAxisUnit.ON_OFF)).toBe('On');
		});
	});

	describe('High-order bit scaling', () => {
		it('scales between high-order bits', () => {
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.EXABITS_SECOND)).toBe(
				'1 Zb/s',
			);
			expect(formatUniversalUnit(1000, UniversalYAxisUnit.ZETTABITS_SECOND)).toBe(
				'1 Yb/s',
			);
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
					throw new Error(`Unit ${unit} does not have a mapping`);
				}
				return hasMapping;
			}),
		).toBe(true);
	});
});

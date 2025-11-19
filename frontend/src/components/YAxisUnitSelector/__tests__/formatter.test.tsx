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
				formatUniversalUnit(900, UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND),
			).toBe('900 H/s');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND,
				),
			).toBe('900 kH/s');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND,
				),
			).toBe('900 MH/s');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND,
				),
			).toBe('900 GH/s');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND,
				),
			).toBe('900 TH/s');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND,
				),
			).toBe('900 PH/s');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND),
			).toBe('900 EH/s');
		});
	});

	describe('Miscellaneous', () => {
		it('formats miscellaneous units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_STRING)).toBe('900');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_SHORT)).toBe('900');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_HUMIDITY)).toBe(
				'900 %H',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_DECIBEL)).toBe(
				'900 dB',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_HEXADECIMAL)).toBe(
				'384',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.MISC_HEXADECIMAL_0X),
			).toBe('0x384');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION),
			).toBe('9e+2');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_LOCALE_FORMAT)).toBe(
				'900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MISC_PIXELS)).toBe(
				'900 px',
			);
		});
	});

	describe('Acceleration', () => {
		it('formats acceleration units', () => {
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED,
				),
			).toBe('900 m/sec²');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED,
				),
			).toBe('900 f/sec²');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.ACCELERATION_G_UNIT),
			).toBe('900 g');
		});
	});

	describe('Angular', () => {
		it('formats angular units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ANGULAR_DEGREE)).toBe(
				'900 °',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ANGULAR_RADIAN)).toBe(
				'900 rad',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ANGULAR_GRADIAN)).toBe(
				'900 grad',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ANGULAR_ARC_MINUTE)).toBe(
				'900 arcmin',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.ANGULAR_ARC_SECOND)).toBe(
				'900 arcsec',
			);
		});
	});

	describe('Area', () => {
		it('formats area units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.AREA_SQUARE_METERS)).toBe(
				'900 m²',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.AREA_SQUARE_FEET)).toBe(
				'900 ft²',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.AREA_SQUARE_MILES)).toBe(
				'900 mi²',
			);
		});
	});

	describe('FLOPs', () => {
		it('formats FLOPs units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_FLOPS)).toBe(
				'900 FLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_MFLOPS)).toBe(
				'900 MFLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_GFLOPS)).toBe(
				'900 GFLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_TFLOPS)).toBe(
				'900 TFLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_PFLOPS)).toBe(
				'900 PFLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_EFLOPS)).toBe(
				'900 EFLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_ZFLOPS)).toBe(
				'900 ZFLOPS',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOPS_YFLOPS)).toBe(
				'900 YFLOPS',
			);
		});
	});

	describe('Concentration', () => {
		it('formats concentration units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_PPM)).toBe(
				'900 ppm',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_PPB)).toBe(
				'900 ppb',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_NG_M3),
			).toBe('900 ng/m³');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER,
				),
			).toBe('900 ng/Nm³');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_UG_M3),
			).toBe('900 μg/m³');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER,
				),
			).toBe('900 μg/Nm³');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_MG_M3),
			).toBe('900 mg/m³');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER,
				),
			).toBe('900 mg/Nm³');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_G_M3)).toBe(
				'900 g/m³',
			);
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER,
				),
			).toBe('900 g/Nm³');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_MG_PER_DL),
			).toBe('900 mg/dL');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L),
			).toBe('900 mmol/L');
		});
	});

	describe('Currency', () => {
		it('formats currency units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_USD)).toBe(
				'$900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_GBP)).toBe(
				'£900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_EUR)).toBe(
				'€900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_JPY)).toBe(
				'¥900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_RUB)).toBe(
				'₽900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_UAH)).toBe(
				'₴900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_BRL)).toBe(
				'R$900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_DKK)).toBe(
				'900kr',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_ISK)).toBe(
				'900kr',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_NOK)).toBe(
				'900kr',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_SEK)).toBe(
				'900kr',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_CZK)).toBe(
				'czk900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_CHF)).toBe(
				'CHF900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_PLN)).toBe(
				'PLN900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_BTC)).toBe(
				'฿900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_MBTC)).toBe(
				'mBTC900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_UBTC)).toBe(
				'μBTC900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_ZAR)).toBe(
				'R900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_INR)).toBe(
				'₹900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_KRW)).toBe(
				'₩900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_IDR)).toBe(
				'Rp900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_PHP)).toBe(
				'PHP900',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.CURRENCY_VND)).toBe(
				'900đ',
			);
		});
	});

	describe('Datetime', () => {
		it('formats datetime units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.DATETIME_ISO_NO_DATE_IF_TODAY),
			).toBe('1970-01-01 08:00:00');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.DATETIME_US)).toBe(
				'01/01/1970 8:00:00 am',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.DATETIME_US_NO_DATE_IF_TODAY),
			).toBe('01/01/1970 8:00:00 am');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.DATETIME_SYSTEM)).toBe(
				'1970-01-01 08:00:00',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.DATETIME_FROM_NOW)).toBe(
				'56 years ago',
			);
		});
	});

	describe('Power/Electrical', () => {
		it('formats power units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_WATT)).toBe(
				'900 W',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOWATT)).toBe(
				'900 kW',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MEGAWATT)).toBe(
				'900 MW',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_GIGAWATT)).toBe(
				'900 GW',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MILLIWATT)).toBe(
				'900 mW',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER),
			).toBe('900 W/m²');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_VOLT_AMPERE)).toBe(
				'900 VA',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOVOLT_AMPERE),
			).toBe('900 kVA');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE),
			).toBe('900 VAr');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE),
			).toBe('900 kVAr');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_WATT_HOUR)).toBe(
				'900 Wh',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG),
			).toBe('900 Wh/kg');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOWATT_HOUR),
			).toBe('900 kWh');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOWATT_MINUTE),
			).toBe('900 kW-Min');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_AMPERE_HOUR)).toBe(
				'900 Ah',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOAMPERE_HOUR),
			).toBe('900 kAh');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR),
			).toBe('900 mAh');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_JOULE)).toBe(
				'900 J',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_ELECTRON_VOLT),
			).toBe('900 eV');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_AMPERE)).toBe(
				'900 A',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOAMPERE)).toBe(
				'900 kA',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MILLIAMPERE)).toBe(
				'900 mA',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_VOLT)).toBe(
				'900 V',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOVOLT)).toBe(
				'900 kV',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MILLIVOLT)).toBe(
				'900 mV',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT),
			).toBe('900 dBm');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_OHM)).toBe('900 Ω');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_KILOOHM)).toBe(
				'900 kΩ',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MEGAOHM)).toBe(
				'900 MΩ',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_FARAD)).toBe(
				'900 F',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MICROFARAD)).toBe(
				'900 µF',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_NANOFARAD)).toBe(
				'900 nF',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_PICOFARAD)).toBe(
				'900 pF',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_FEMTOFARAD)).toBe(
				'900 fF',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_HENRY)).toBe(
				'900 H',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MILLIHENRY)).toBe(
				'900 mH',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_MICROHENRY)).toBe(
				'900 µH',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.POWER_LUMENS)).toBe(
				'900 Lm',
			);
		});
	});

	describe('Flow', () => {
		it('formats flow units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE),
			).toBe('900 gpm');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND),
			).toBe('900 cms');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND),
			).toBe('900 cfs');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE),
			).toBe('900 cfm');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_LITERS_PER_HOUR),
			).toBe('900 L/h');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE),
			).toBe('900 L/min');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE),
			).toBe('900 mL/min');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FLOW_LUX)).toBe(
				'900 lux',
			);
		});
	});

	describe('Force', () => {
		it('formats force units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FORCE_NEWTON_METERS),
			).toBe('900 Nm');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.FORCE_KILONEWTON_METERS),
			).toBe('900 kNm');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FORCE_NEWTONS)).toBe(
				'900 N',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.FORCE_KILONEWTONS)).toBe(
				'900 kN',
			);
		});
	});

	describe('Mass', () => {
		it('formats mass units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MASS_MILLIGRAM)).toBe(
				'900 mg',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MASS_GRAM)).toBe('900 g');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MASS_POUND)).toBe(
				'900 lb',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MASS_KILOGRAM)).toBe(
				'900 kg',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.MASS_METRIC_TON)).toBe(
				'900 t',
			);
		});
	});

	describe('Length', () => {
		it('formats length units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.LENGTH_MILLIMETER)).toBe(
				'900 mm',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.LENGTH_INCH)).toBe(
				'900 in',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.LENGTH_FOOT)).toBe(
				'900 ft',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.LENGTH_METER)).toBe(
				'900 m',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.LENGTH_KILOMETER)).toBe(
				'900 km',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.LENGTH_MILE)).toBe(
				'900 mi',
			);
		});
	});

	describe('Pressure', () => {
		it('formats pressure units', () => {
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_MILLIBAR)).toBe(
				'900 mbar',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_BAR)).toBe(
				'900 bar',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_KILOBAR)).toBe(
				'900 kbar',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_PASCAL)).toBe(
				'900 Pa',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_HECTOPASCAL),
			).toBe('900 hPa');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_KILOPASCAL),
			).toBe('900 kPa');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_INCHES_HG)).toBe(
				'900 "Hg',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.PRESSURE_PSI)).toBe(
				'900psi',
			);
		});
	});

	describe('Radiation', () => {
		it('formats radiation units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_BECQUEREL),
			).toBe('900 Bq');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_CURIE)).toBe(
				'900 Ci',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_GRAY)).toBe(
				'900 Gy',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_RAD)).toBe(
				'900 rad',
			);
			expect(formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_SIEVERT)).toBe(
				'900 Sv',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_MILLISIEVERT),
			).toBe('900 mSv');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_MICROSIEVERT),
			).toBe('900 µSv');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_REM)).toBe(
				'900 rem',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG),
			).toBe('900 C/kg');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_ROENTGEN)).toBe(
				'900 R',
			);
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR),
			).toBe('900 Sv/h');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR,
				),
			).toBe('900 mSv/h');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR,
				),
			).toBe('900 µSv/h');
		});
	});

	describe('Rotation Speed', () => {
		it('formats rotation speed units', () => {
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE,
				),
			).toBe('900 rpm');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.ROTATION_SPEED_HERTZ),
			).toBe('900 Hz');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND,
				),
			).toBe('900 rad/s');
			expect(
				formatUniversalUnit(
					900,
					UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND,
				),
			).toBe('900 °/s');
		});
	});

	describe('Temperature', () => {
		it('formats temperature units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.TEMPERATURE_CELSIUS),
			).toBe('900 °C');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT),
			).toBe('900 °F');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.TEMPERATURE_KELVIN)).toBe(
				'900 K',
			);
		});
	});

	describe('Velocity', () => {
		it('formats velocity units', () => {
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND),
			).toBe('900 m/s');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR),
			).toBe('900 km/h');
			expect(
				formatUniversalUnit(900, UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR),
			).toBe('900 mph');
			expect(formatUniversalUnit(900, UniversalYAxisUnit.VELOCITY_KNOT)).toBe(
				'900 kn',
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

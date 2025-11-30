import { Y_AXIS_UNIT_NAMES } from './constants';
import { UniversalYAxisUnit, YAxisCategory } from './types';

// Base categories for the universal y-axis units
export const BASE_Y_AXIS_CATEGORIES: YAxisCategory[] = [
	{
		name: 'Time',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.SECONDS],
				id: UniversalYAxisUnit.SECONDS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MILLISECONDS],
				id: UniversalYAxisUnit.MILLISECONDS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MICROSECONDS],
				id: UniversalYAxisUnit.MICROSECONDS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.NANOSECONDS],
				id: UniversalYAxisUnit.NANOSECONDS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MINUTES],
				id: UniversalYAxisUnit.MINUTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HOURS],
				id: UniversalYAxisUnit.HOURS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DAYS],
				id: UniversalYAxisUnit.DAYS,
			},
		],
	},
	{
		name: 'Data',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BYTES],
				id: UniversalYAxisUnit.BYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KILOBYTES],
				id: UniversalYAxisUnit.KILOBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEGABYTES],
				id: UniversalYAxisUnit.MEGABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIGABYTES],
				id: UniversalYAxisUnit.GIGABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TERABYTES],
				id: UniversalYAxisUnit.TERABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PETABYTES],
				id: UniversalYAxisUnit.PETABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABYTES],
				id: UniversalYAxisUnit.EXABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABYTES],
				id: UniversalYAxisUnit.ZETTABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABYTES],
				id: UniversalYAxisUnit.YOTTABYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BYTES_IEC],
				id: UniversalYAxisUnit.BYTES_IEC,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KIBIBYTES],
				id: UniversalYAxisUnit.KIBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEBIBYTES],
				id: UniversalYAxisUnit.MEBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIBIBYTES],
				id: UniversalYAxisUnit.GIBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TEBIBYTES],
				id: UniversalYAxisUnit.TEBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PEBIBYTES],
				id: UniversalYAxisUnit.PEBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXBIBYTES],
				id: UniversalYAxisUnit.EXBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZEBIBYTES],
				id: UniversalYAxisUnit.ZEBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOBIBYTES],
				id: UniversalYAxisUnit.YOBIBYTES,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BITS],
				id: UniversalYAxisUnit.BITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BITS_IEC],
				id: UniversalYAxisUnit.BITS_IEC,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KILOBITS],
				id: UniversalYAxisUnit.KILOBITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEGABITS],
				id: UniversalYAxisUnit.MEGABITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIGABITS],
				id: UniversalYAxisUnit.GIGABITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TERABITS],
				id: UniversalYAxisUnit.TERABITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PETABITS],
				id: UniversalYAxisUnit.PETABITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABITS],
				id: UniversalYAxisUnit.EXABITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABITS],
				id: UniversalYAxisUnit.ZETTABITS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABITS],
				id: UniversalYAxisUnit.YOTTABITS,
			},
		],
	},
	{
		name: 'Data Rate',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BYTES_SECOND],
				id: UniversalYAxisUnit.BYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KILOBYTES_SECOND],
				id: UniversalYAxisUnit.KILOBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEGABYTES_SECOND],
				id: UniversalYAxisUnit.MEGABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIGABYTES_SECOND],
				id: UniversalYAxisUnit.GIGABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TERABYTES_SECOND],
				id: UniversalYAxisUnit.TERABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PETABYTES_SECOND],
				id: UniversalYAxisUnit.PETABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABYTES_SECOND],
				id: UniversalYAxisUnit.EXABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABYTES_SECOND],
				id: UniversalYAxisUnit.ZETTABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABYTES_SECOND],
				id: UniversalYAxisUnit.YOTTABYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KIBIBYTES_SECOND],
				id: UniversalYAxisUnit.KIBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEBIBYTES_SECOND],
				id: UniversalYAxisUnit.MEBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIBIBYTES_SECOND],
				id: UniversalYAxisUnit.GIBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TEBIBYTES_SECOND],
				id: UniversalYAxisUnit.TEBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PEBIBYTES_SECOND],
				id: UniversalYAxisUnit.PEBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXBIBYTES_SECOND],
				id: UniversalYAxisUnit.EXBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZEBIBYTES_SECOND],
				id: UniversalYAxisUnit.ZEBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOBIBYTES_SECOND],
				id: UniversalYAxisUnit.YOBIBYTES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BITS_SECOND],
				id: UniversalYAxisUnit.BITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KILOBITS_SECOND],
				id: UniversalYAxisUnit.KILOBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEGABITS_SECOND],
				id: UniversalYAxisUnit.MEGABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIGABITS_SECOND],
				id: UniversalYAxisUnit.GIGABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TERABITS_SECOND],
				id: UniversalYAxisUnit.TERABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PETABITS_SECOND],
				id: UniversalYAxisUnit.PETABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABITS_SECOND],
				id: UniversalYAxisUnit.EXABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABITS_SECOND],
				id: UniversalYAxisUnit.ZETTABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABITS_SECOND],
				id: UniversalYAxisUnit.YOTTABITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KIBIBITS_SECOND],
				id: UniversalYAxisUnit.KIBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEBIBITS_SECOND],
				id: UniversalYAxisUnit.MEBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIBIBITS_SECOND],
				id: UniversalYAxisUnit.GIBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TEBIBITS_SECOND],
				id: UniversalYAxisUnit.TEBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PEBIBITS_SECOND],
				id: UniversalYAxisUnit.PEBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXBIBITS_SECOND],
				id: UniversalYAxisUnit.EXBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZEBIBITS_SECOND],
				id: UniversalYAxisUnit.ZEBIBITS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOBIBITS_SECOND],
				id: UniversalYAxisUnit.YOBIBITS_SECOND,
			},
		],
	},
	{
		name: 'Count',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.COUNT],
				id: UniversalYAxisUnit.COUNT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.COUNT_SECOND],
				id: UniversalYAxisUnit.COUNT_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.COUNT_MINUTE],
				id: UniversalYAxisUnit.COUNT_MINUTE,
			},
		],
	},
	{
		name: 'Operations',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.OPS_SECOND],
				id: UniversalYAxisUnit.OPS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.OPS_MINUTE],
				id: UniversalYAxisUnit.OPS_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.REQUESTS_SECOND],
				id: UniversalYAxisUnit.REQUESTS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.REQUESTS_MINUTE],
				id: UniversalYAxisUnit.REQUESTS_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.READS_SECOND],
				id: UniversalYAxisUnit.READS_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.WRITES_SECOND],
				id: UniversalYAxisUnit.WRITES_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.READS_MINUTE],
				id: UniversalYAxisUnit.READS_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.WRITES_MINUTE],
				id: UniversalYAxisUnit.WRITES_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.IOOPS_SECOND],
				id: UniversalYAxisUnit.IOOPS_SECOND,
			},
		],
	},
	{
		name: 'Percentage',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PERCENT],
				id: UniversalYAxisUnit.PERCENT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PERCENT_UNIT],
				id: UniversalYAxisUnit.PERCENT_UNIT,
			},
		],
	},
	{
		name: 'Boolean',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TRUE_FALSE],
				id: UniversalYAxisUnit.TRUE_FALSE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YES_NO],
				id: UniversalYAxisUnit.YES_NO,
			},
		],
	},
];

export const ADDITIONAL_Y_AXIS_CATEGORIES: YAxisCategory[] = [
	{
		name: 'Time',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DURATION_MS],
				id: UniversalYAxisUnit.DURATION_MS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DURATION_S],
				id: UniversalYAxisUnit.DURATION_S,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DURATION_HMS],
				id: UniversalYAxisUnit.DURATION_HMS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DURATION_DHMS],
				id: UniversalYAxisUnit.DURATION_DHMS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TIMETICKS],
				id: UniversalYAxisUnit.TIMETICKS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CLOCK_MS],
				id: UniversalYAxisUnit.CLOCK_MS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CLOCK_S],
				id: UniversalYAxisUnit.CLOCK_S,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TIME_HERTZ],
				id: UniversalYAxisUnit.TIME_HERTZ,
			},
		],
	},
	{
		name: 'Data Rate',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND],
				id: UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND,
			},
		],
	},
	{
		name: 'Boolean',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ON_OFF],
				id: UniversalYAxisUnit.ON_OFF,
			},
		],
	},
	{
		name: 'None',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.NONE],
				id: UniversalYAxisUnit.NONE,
			},
		],
	},
	{
		name: 'Hash Rate',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND],
				id: UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND,
			},
		],
	},
	{
		name: 'Miscellaneous',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_STRING],
				id: UniversalYAxisUnit.MISC_STRING,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_SHORT],
				id: UniversalYAxisUnit.MISC_SHORT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_HUMIDITY],
				id: UniversalYAxisUnit.MISC_HUMIDITY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_DECIBEL],
				id: UniversalYAxisUnit.MISC_DECIBEL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_HEXADECIMAL],
				id: UniversalYAxisUnit.MISC_HEXADECIMAL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_HEXADECIMAL_0X],
				id: UniversalYAxisUnit.MISC_HEXADECIMAL_0X,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION],
				id: UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_LOCALE_FORMAT],
				id: UniversalYAxisUnit.MISC_LOCALE_FORMAT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MISC_PIXELS],
				id: UniversalYAxisUnit.MISC_PIXELS,
			},
		],
	},
	{
		name: 'Acceleration',
		units: [
			{
				name:
					Y_AXIS_UNIT_NAMES[
						UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED
					],
				id: UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED],
				id: UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ACCELERATION_G_UNIT],
				id: UniversalYAxisUnit.ACCELERATION_G_UNIT,
			},
		],
	},
	{
		name: 'Angular',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ANGULAR_DEGREE],
				id: UniversalYAxisUnit.ANGULAR_DEGREE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ANGULAR_RADIAN],
				id: UniversalYAxisUnit.ANGULAR_RADIAN,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ANGULAR_GRADIAN],
				id: UniversalYAxisUnit.ANGULAR_GRADIAN,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ANGULAR_ARC_MINUTE],
				id: UniversalYAxisUnit.ANGULAR_ARC_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ANGULAR_ARC_SECOND],
				id: UniversalYAxisUnit.ANGULAR_ARC_SECOND,
			},
		],
	},
	{
		name: 'Area',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.AREA_SQUARE_METERS],
				id: UniversalYAxisUnit.AREA_SQUARE_METERS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.AREA_SQUARE_FEET],
				id: UniversalYAxisUnit.AREA_SQUARE_FEET,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.AREA_SQUARE_MILES],
				id: UniversalYAxisUnit.AREA_SQUARE_MILES,
			},
		],
	},
	{
		name: 'FLOPs',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_FLOPS],
				id: UniversalYAxisUnit.FLOPS_FLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_MFLOPS],
				id: UniversalYAxisUnit.FLOPS_MFLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_GFLOPS],
				id: UniversalYAxisUnit.FLOPS_GFLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_TFLOPS],
				id: UniversalYAxisUnit.FLOPS_TFLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_PFLOPS],
				id: UniversalYAxisUnit.FLOPS_PFLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_EFLOPS],
				id: UniversalYAxisUnit.FLOPS_EFLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_ZFLOPS],
				id: UniversalYAxisUnit.FLOPS_ZFLOPS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOPS_YFLOPS],
				id: UniversalYAxisUnit.FLOPS_YFLOPS,
			},
		],
	},
	{
		name: 'Concentration',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_PPM],
				id: UniversalYAxisUnit.CONCENTRATION_PPM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_PPB],
				id: UniversalYAxisUnit.CONCENTRATION_PPB,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_NG_M3],
				id: UniversalYAxisUnit.CONCENTRATION_NG_M3,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER],
				id: UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_UG_M3],
				id: UniversalYAxisUnit.CONCENTRATION_UG_M3,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER],
				id: UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_MG_M3],
				id: UniversalYAxisUnit.CONCENTRATION_MG_M3,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER],
				id: UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_G_M3],
				id: UniversalYAxisUnit.CONCENTRATION_G_M3,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER],
				id: UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_MG_PER_DL],
				id: UniversalYAxisUnit.CONCENTRATION_MG_PER_DL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L],
				id: UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L,
			},
		],
	},
	{
		name: 'Currency',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_USD],
				id: UniversalYAxisUnit.CURRENCY_USD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_GBP],
				id: UniversalYAxisUnit.CURRENCY_GBP,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_EUR],
				id: UniversalYAxisUnit.CURRENCY_EUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_JPY],
				id: UniversalYAxisUnit.CURRENCY_JPY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_RUB],
				id: UniversalYAxisUnit.CURRENCY_RUB,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_UAH],
				id: UniversalYAxisUnit.CURRENCY_UAH,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_BRL],
				id: UniversalYAxisUnit.CURRENCY_BRL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_DKK],
				id: UniversalYAxisUnit.CURRENCY_DKK,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_ISK],
				id: UniversalYAxisUnit.CURRENCY_ISK,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_NOK],
				id: UniversalYAxisUnit.CURRENCY_NOK,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_SEK],
				id: UniversalYAxisUnit.CURRENCY_SEK,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_CZK],
				id: UniversalYAxisUnit.CURRENCY_CZK,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_CHF],
				id: UniversalYAxisUnit.CURRENCY_CHF,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_PLN],
				id: UniversalYAxisUnit.CURRENCY_PLN,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_BTC],
				id: UniversalYAxisUnit.CURRENCY_BTC,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_MBTC],
				id: UniversalYAxisUnit.CURRENCY_MBTC,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_UBTC],
				id: UniversalYAxisUnit.CURRENCY_UBTC,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_ZAR],
				id: UniversalYAxisUnit.CURRENCY_ZAR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_INR],
				id: UniversalYAxisUnit.CURRENCY_INR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_KRW],
				id: UniversalYAxisUnit.CURRENCY_KRW,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_IDR],
				id: UniversalYAxisUnit.CURRENCY_IDR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_PHP],
				id: UniversalYAxisUnit.CURRENCY_PHP,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.CURRENCY_VND],
				id: UniversalYAxisUnit.CURRENCY_VND,
			},
		],
	},
	{
		name: 'Datetime',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_ISO],
				id: UniversalYAxisUnit.DATETIME_ISO,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_ISO_NO_DATE_IF_TODAY],
				id: UniversalYAxisUnit.DATETIME_ISO_NO_DATE_IF_TODAY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_US],
				id: UniversalYAxisUnit.DATETIME_US,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_US_NO_DATE_IF_TODAY],
				id: UniversalYAxisUnit.DATETIME_US_NO_DATE_IF_TODAY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_LOCAL],
				id: UniversalYAxisUnit.DATETIME_LOCAL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_LOCAL_NO_DATE_IF_TODAY],
				id: UniversalYAxisUnit.DATETIME_LOCAL_NO_DATE_IF_TODAY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_SYSTEM],
				id: UniversalYAxisUnit.DATETIME_SYSTEM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.DATETIME_FROM_NOW],
				id: UniversalYAxisUnit.DATETIME_FROM_NOW,
			},
		],
	},
	{
		name: 'Power/Electrical',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_WATT],
				id: UniversalYAxisUnit.POWER_WATT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOWATT],
				id: UniversalYAxisUnit.POWER_KILOWATT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MEGAWATT],
				id: UniversalYAxisUnit.POWER_MEGAWATT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_GIGAWATT],
				id: UniversalYAxisUnit.POWER_GIGAWATT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MILLIWATT],
				id: UniversalYAxisUnit.POWER_MILLIWATT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER],
				id: UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_VOLT_AMPERE],
				id: UniversalYAxisUnit.POWER_VOLT_AMPERE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOVOLT_AMPERE],
				id: UniversalYAxisUnit.POWER_KILOVOLT_AMPERE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE],
				id: UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE],
				id: UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_WATT_HOUR],
				id: UniversalYAxisUnit.POWER_WATT_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG],
				id: UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOWATT_HOUR],
				id: UniversalYAxisUnit.POWER_KILOWATT_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOWATT_MINUTE],
				id: UniversalYAxisUnit.POWER_KILOWATT_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_AMPERE_HOUR],
				id: UniversalYAxisUnit.POWER_AMPERE_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOAMPERE_HOUR],
				id: UniversalYAxisUnit.POWER_KILOAMPERE_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR],
				id: UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_JOULE],
				id: UniversalYAxisUnit.POWER_JOULE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_ELECTRON_VOLT],
				id: UniversalYAxisUnit.POWER_ELECTRON_VOLT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_AMPERE],
				id: UniversalYAxisUnit.POWER_AMPERE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOAMPERE],
				id: UniversalYAxisUnit.POWER_KILOAMPERE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MILLIAMPERE],
				id: UniversalYAxisUnit.POWER_MILLIAMPERE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_VOLT],
				id: UniversalYAxisUnit.POWER_VOLT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOVOLT],
				id: UniversalYAxisUnit.POWER_KILOVOLT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MILLIVOLT],
				id: UniversalYAxisUnit.POWER_MILLIVOLT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT],
				id: UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_OHM],
				id: UniversalYAxisUnit.POWER_OHM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_KILOOHM],
				id: UniversalYAxisUnit.POWER_KILOOHM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MEGAOHM],
				id: UniversalYAxisUnit.POWER_MEGAOHM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_FARAD],
				id: UniversalYAxisUnit.POWER_FARAD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MICROFARAD],
				id: UniversalYAxisUnit.POWER_MICROFARAD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_NANOFARAD],
				id: UniversalYAxisUnit.POWER_NANOFARAD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_PICOFARAD],
				id: UniversalYAxisUnit.POWER_PICOFARAD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_FEMTOFARAD],
				id: UniversalYAxisUnit.POWER_FEMTOFARAD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_HENRY],
				id: UniversalYAxisUnit.POWER_HENRY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MILLIHENRY],
				id: UniversalYAxisUnit.POWER_MILLIHENRY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_MICROHENRY],
				id: UniversalYAxisUnit.POWER_MICROHENRY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.POWER_LUMENS],
				id: UniversalYAxisUnit.POWER_LUMENS,
			},
		],
	},
	{
		name: 'Flow',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE],
				id: UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND],
				id: UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND],
				id: UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE],
				id: UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_LITERS_PER_HOUR],
				id: UniversalYAxisUnit.FLOW_LITERS_PER_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE],
				id: UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE],
				id: UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FLOW_LUX],
				id: UniversalYAxisUnit.FLOW_LUX,
			},
		],
	},
	{
		name: 'Force',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FORCE_NEWTON_METERS],
				id: UniversalYAxisUnit.FORCE_NEWTON_METERS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FORCE_KILONEWTON_METERS],
				id: UniversalYAxisUnit.FORCE_KILONEWTON_METERS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FORCE_NEWTONS],
				id: UniversalYAxisUnit.FORCE_NEWTONS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.FORCE_KILONEWTONS],
				id: UniversalYAxisUnit.FORCE_KILONEWTONS,
			},
		],
	},
	{
		name: 'Mass',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MASS_MILLIGRAM],
				id: UniversalYAxisUnit.MASS_MILLIGRAM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MASS_GRAM],
				id: UniversalYAxisUnit.MASS_GRAM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MASS_POUND],
				id: UniversalYAxisUnit.MASS_POUND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MASS_KILOGRAM],
				id: UniversalYAxisUnit.MASS_KILOGRAM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MASS_METRIC_TON],
				id: UniversalYAxisUnit.MASS_METRIC_TON,
			},
		],
	},
	{
		name: 'Length',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.LENGTH_MILLIMETER],
				id: UniversalYAxisUnit.LENGTH_MILLIMETER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.LENGTH_INCH],
				id: UniversalYAxisUnit.LENGTH_INCH,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.LENGTH_FOOT],
				id: UniversalYAxisUnit.LENGTH_FOOT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.LENGTH_METER],
				id: UniversalYAxisUnit.LENGTH_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.LENGTH_KILOMETER],
				id: UniversalYAxisUnit.LENGTH_KILOMETER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.LENGTH_MILE],
				id: UniversalYAxisUnit.LENGTH_MILE,
			},
		],
	},
	{
		name: 'Pressure',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_MILLIBAR],
				id: UniversalYAxisUnit.PRESSURE_MILLIBAR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_BAR],
				id: UniversalYAxisUnit.PRESSURE_BAR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_KILOBAR],
				id: UniversalYAxisUnit.PRESSURE_KILOBAR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_PASCAL],
				id: UniversalYAxisUnit.PRESSURE_PASCAL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_HECTOPASCAL],
				id: UniversalYAxisUnit.PRESSURE_HECTOPASCAL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_KILOPASCAL],
				id: UniversalYAxisUnit.PRESSURE_KILOPASCAL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_INCHES_HG],
				id: UniversalYAxisUnit.PRESSURE_INCHES_HG,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PRESSURE_PSI],
				id: UniversalYAxisUnit.PRESSURE_PSI,
			},
		],
	},
	{
		name: 'Radiation',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_BECQUEREL],
				id: UniversalYAxisUnit.RADIATION_BECQUEREL,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_CURIE],
				id: UniversalYAxisUnit.RADIATION_CURIE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_GRAY],
				id: UniversalYAxisUnit.RADIATION_GRAY,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_RAD],
				id: UniversalYAxisUnit.RADIATION_RAD,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_SIEVERT],
				id: UniversalYAxisUnit.RADIATION_SIEVERT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_MILLISIEVERT],
				id: UniversalYAxisUnit.RADIATION_MILLISIEVERT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_MICROSIEVERT],
				id: UniversalYAxisUnit.RADIATION_MICROSIEVERT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_REM],
				id: UniversalYAxisUnit.RADIATION_REM,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG],
				id: UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_ROENTGEN],
				id: UniversalYAxisUnit.RADIATION_ROENTGEN,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR],
				id: UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR],
				id: UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR],
				id: UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR,
			},
		],
	},
	{
		name: 'Rotation Speed',
		units: [
			{
				name:
					Y_AXIS_UNIT_NAMES[
						UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE
					],
				id: UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ROTATION_SPEED_HERTZ],
				id: UniversalYAxisUnit.ROTATION_SPEED_HERTZ,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND],
				id: UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND,
			},
			{
				name:
					Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND],
				id: UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND,
			},
		],
	},
	{
		name: 'Temperature',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TEMPERATURE_CELSIUS],
				id: UniversalYAxisUnit.TEMPERATURE_CELSIUS,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT],
				id: UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TEMPERATURE_KELVIN],
				id: UniversalYAxisUnit.TEMPERATURE_KELVIN,
			},
		],
	},
	{
		name: 'Velocity',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND],
				id: UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR],
				id: UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR],
				id: UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VELOCITY_KNOT],
				id: UniversalYAxisUnit.VELOCITY_KNOT,
			},
		],
	},
	{
		name: 'Volume',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VOLUME_MILLILITER],
				id: UniversalYAxisUnit.VOLUME_MILLILITER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VOLUME_LITER],
				id: UniversalYAxisUnit.VOLUME_LITER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VOLUME_CUBIC_METER],
				id: UniversalYAxisUnit.VOLUME_CUBIC_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER],
				id: UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER],
				id: UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER,
			},
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.VOLUME_GALLON],
				id: UniversalYAxisUnit.VOLUME_GALLON,
			},
		],
	},
];

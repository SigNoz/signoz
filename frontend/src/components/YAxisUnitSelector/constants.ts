import { UnitFamilyConfig, UniversalYAxisUnit, YAxisUnit } from './types';

// Mapping of universal y-axis units to their AWS, UCUM, and OpenMetrics equivalents (if available)
export const UniversalYAxisUnitMappings: Partial<
	Record<UniversalYAxisUnit, Set<YAxisUnit> | null>
> = {
	// Time
	[UniversalYAxisUnit.NANOSECONDS]: new Set([
		YAxisUnit.UCUM_NANOSECONDS,
		YAxisUnit.OPEN_METRICS_NANOSECONDS,
	]),
	[UniversalYAxisUnit.MICROSECONDS]: new Set([
		YAxisUnit.AWS_MICROSECONDS,
		YAxisUnit.UCUM_MICROSECONDS,
		YAxisUnit.OPEN_METRICS_MICROSECONDS,
	]),
	[UniversalYAxisUnit.MILLISECONDS]: new Set([
		YAxisUnit.AWS_MILLISECONDS,
		YAxisUnit.UCUM_MILLISECONDS,
		YAxisUnit.OPEN_METRICS_MILLISECONDS,
	]),
	[UniversalYAxisUnit.SECONDS]: new Set([
		YAxisUnit.AWS_SECONDS,
		YAxisUnit.UCUM_SECONDS,
		YAxisUnit.OPEN_METRICS_SECONDS,
	]),
	[UniversalYAxisUnit.MINUTES]: new Set([
		YAxisUnit.UCUM_MINUTES,
		YAxisUnit.OPEN_METRICS_MINUTES,
	]),
	[UniversalYAxisUnit.HOURS]: new Set([
		YAxisUnit.UCUM_HOURS,
		YAxisUnit.OPEN_METRICS_HOURS,
	]),
	[UniversalYAxisUnit.DAYS]: new Set([
		YAxisUnit.UCUM_DAYS,
		YAxisUnit.OPEN_METRICS_DAYS,
	]),

	// Data
	[UniversalYAxisUnit.BYTES]: new Set([
		YAxisUnit.AWS_BYTES,
		YAxisUnit.UCUM_BYTES,
		YAxisUnit.OPEN_METRICS_BYTES,
	]),
	[UniversalYAxisUnit.KILOBYTES]: new Set([
		YAxisUnit.AWS_KILOBYTES,
		YAxisUnit.UCUM_KILOBYTES,
		YAxisUnit.OPEN_METRICS_KILOBYTES,
	]),
	[UniversalYAxisUnit.MEGABYTES]: new Set([
		YAxisUnit.AWS_MEGABYTES,
		YAxisUnit.UCUM_MEGABYTES,
		YAxisUnit.OPEN_METRICS_MEGABYTES,
	]),
	[UniversalYAxisUnit.GIGABYTES]: new Set([
		YAxisUnit.AWS_GIGABYTES,
		YAxisUnit.UCUM_GIGABYTES,
		YAxisUnit.OPEN_METRICS_GIGABYTES,
	]),
	[UniversalYAxisUnit.TERABYTES]: new Set([
		YAxisUnit.AWS_TERABYTES,
		YAxisUnit.UCUM_TERABYTES,
		YAxisUnit.OPEN_METRICS_TERABYTES,
	]),
	[UniversalYAxisUnit.PETABYTES]: new Set([
		YAxisUnit.AWS_PETABYTES,
		YAxisUnit.UCUM_PEBIBYTES,
		YAxisUnit.OPEN_METRICS_PEBIBYTES,
	]),
	[UniversalYAxisUnit.EXABYTES]: new Set([
		YAxisUnit.AWS_EXABYTES,
		YAxisUnit.UCUM_EXABYTES,
		YAxisUnit.OPEN_METRICS_EXABYTES,
	]),
	[UniversalYAxisUnit.ZETTABYTES]: new Set([
		YAxisUnit.AWS_ZETTABYTES,
		YAxisUnit.UCUM_ZETTABYTES,
		YAxisUnit.OPEN_METRICS_ZETTABYTES,
	]),
	[UniversalYAxisUnit.YOTTABYTES]: new Set([
		YAxisUnit.AWS_YOTTABYTES,
		YAxisUnit.UCUM_YOTTABYTES,
		YAxisUnit.OPEN_METRICS_YOTTABYTES,
	]),

	// Binary (IEC) Data
	[UniversalYAxisUnit.KIBIBYTES]: new Set([
		YAxisUnit.UCUM_KIBIBYTES,
		YAxisUnit.OPEN_METRICS_KIBIBYTES,
	]),
	[UniversalYAxisUnit.MEBIBYTES]: new Set([
		YAxisUnit.UCUM_MEBIBYTES,
		YAxisUnit.OPEN_METRICS_MEBIBYTES,
	]),
	[UniversalYAxisUnit.GIBIBYTES]: new Set([
		YAxisUnit.UCUM_GIBIBYTES,
		YAxisUnit.OPEN_METRICS_GIBIBYTES,
	]),
	[UniversalYAxisUnit.TEBIBYTES]: new Set([
		YAxisUnit.UCUM_TEBIBYTES,
		YAxisUnit.OPEN_METRICS_TEBIBYTES,
	]),
	[UniversalYAxisUnit.PEBIBYTES]: new Set([
		YAxisUnit.UCUM_PEBIBYTES,
		YAxisUnit.OPEN_METRICS_PEBIBYTES,
	]),
	[UniversalYAxisUnit.EXBIBYTES]: new Set([
		YAxisUnit.UCUM_EXBIBYTES,
		YAxisUnit.OPEN_METRICS_EXBIBYTES,
	]),
	[UniversalYAxisUnit.ZEBIBYTES]: new Set([
		YAxisUnit.UCUM_ZEBIBYTES,
		YAxisUnit.OPEN_METRICS_ZEBIBYTES,
	]),
	[UniversalYAxisUnit.YOBIBYTES]: new Set([
		YAxisUnit.UCUM_YOBIBYTES,
		YAxisUnit.OPEN_METRICS_YOBIBYTES,
	]),

	// Data Rate
	[UniversalYAxisUnit.BYTES_SECOND]: new Set([
		YAxisUnit.AWS_BYTES_SECOND,
		YAxisUnit.UCUM_BYTES_SECOND,
		YAxisUnit.OPEN_METRICS_BYTES_SECOND,
	]),
	[UniversalYAxisUnit.KILOBYTES_SECOND]: new Set([
		YAxisUnit.AWS_KILOBYTES_SECOND,
		YAxisUnit.UCUM_KILOBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_KILOBYTES_SECOND,
	]),
	[UniversalYAxisUnit.MEGABYTES_SECOND]: new Set([
		YAxisUnit.AWS_MEGABYTES_SECOND,
		YAxisUnit.UCUM_MEGABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_MEGABYTES_SECOND,
	]),
	[UniversalYAxisUnit.GIGABYTES_SECOND]: new Set([
		YAxisUnit.AWS_GIGABYTES_SECOND,
		YAxisUnit.UCUM_GIGABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_GIGABYTES_SECOND,
	]),
	[UniversalYAxisUnit.TERABYTES_SECOND]: new Set([
		YAxisUnit.AWS_TERABYTES_SECOND,
		YAxisUnit.UCUM_TERABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_TERABYTES_SECOND,
	]),
	[UniversalYAxisUnit.PETABYTES_SECOND]: new Set([
		YAxisUnit.AWS_PETABYTES_SECOND,
		YAxisUnit.UCUM_PETABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_PETABYTES_SECOND,
	]),
	[UniversalYAxisUnit.EXABYTES_SECOND]: new Set([
		YAxisUnit.AWS_EXABYTES_SECOND,
		YAxisUnit.UCUM_EXABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_EXABYTES_SECOND,
	]),
	[UniversalYAxisUnit.ZETTABYTES_SECOND]: new Set([
		YAxisUnit.AWS_ZETTABYTES_SECOND,
		YAxisUnit.UCUM_ZETTABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_ZETTABYTES_SECOND,
	]),
	[UniversalYAxisUnit.YOTTABYTES_SECOND]: new Set([
		YAxisUnit.AWS_YOTTABYTES_SECOND,
		YAxisUnit.UCUM_YOTTABYTES_SECOND,
		YAxisUnit.OPEN_METRICS_YOTTABYTES_SECOND,
	]),

	// Binary (IEC) Data Rate
	[UniversalYAxisUnit.KIBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_KIBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_KIBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.MEBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_MEBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_MEBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.GIBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_GIBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_GIBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.TEBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_TEBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_TEBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.PEBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_PEBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_PEBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.EXBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_EXBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_EXBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.ZEBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_ZEBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_ZEBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.YOBIBYTES_SECOND]: new Set([
		YAxisUnit.UCUM_YOBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_YOBIBYTES_SECOND,
	]),

	// Bits
	[UniversalYAxisUnit.BITS]: new Set([
		YAxisUnit.AWS_BITS,
		YAxisUnit.UCUM_BITS,
		YAxisUnit.OPEN_METRICS_BITS,
	]),
	[UniversalYAxisUnit.KILOBITS]: new Set([
		YAxisUnit.AWS_KILOBITS,
		YAxisUnit.UCUM_KILOBITS,
		YAxisUnit.OPEN_METRICS_KILOBITS,
	]),
	[UniversalYAxisUnit.MEGABITS]: new Set([
		YAxisUnit.AWS_MEGABITS,
		YAxisUnit.UCUM_MEGABITS,
		YAxisUnit.OPEN_METRICS_MEGABITS,
	]),
	[UniversalYAxisUnit.GIGABITS]: new Set([
		YAxisUnit.AWS_GIGABITS,
		YAxisUnit.UCUM_GIGABITS,
		YAxisUnit.OPEN_METRICS_GIGABITS,
	]),
	[UniversalYAxisUnit.TERABITS]: new Set([
		YAxisUnit.AWS_TERABITS,
		YAxisUnit.UCUM_TERABITS,
		YAxisUnit.OPEN_METRICS_TERABITS,
	]),
	[UniversalYAxisUnit.PETABITS]: new Set([
		YAxisUnit.AWS_PETABITS,
		YAxisUnit.UCUM_PETABITS,
		YAxisUnit.OPEN_METRICS_PETABITS,
	]),
	[UniversalYAxisUnit.EXABITS]: new Set([
		YAxisUnit.AWS_EXABITS,
		YAxisUnit.UCUM_EXABITS,
		YAxisUnit.OPEN_METRICS_EXABITS,
	]),
	[UniversalYAxisUnit.ZETTABITS]: new Set([
		YAxisUnit.AWS_ZETTABITS,
		YAxisUnit.UCUM_ZETTABITS,
		YAxisUnit.OPEN_METRICS_ZETTABITS,
	]),
	[UniversalYAxisUnit.YOTTABITS]: new Set([
		YAxisUnit.AWS_YOTTABITS,
		YAxisUnit.UCUM_YOTTABITS,
		YAxisUnit.OPEN_METRICS_YOTTABITS,
	]),

	// Bit Rate
	[UniversalYAxisUnit.BITS_SECOND]: new Set([
		YAxisUnit.AWS_BITS_SECOND,
		YAxisUnit.UCUM_BITS_SECOND,
		YAxisUnit.OPEN_METRICS_BITS_SECOND,
	]),
	[UniversalYAxisUnit.KILOBITS_SECOND]: new Set([
		YAxisUnit.AWS_KILOBITS_SECOND,
		YAxisUnit.UCUM_KILOBITS_SECOND,
		YAxisUnit.OPEN_METRICS_KILOBITS_SECOND,
	]),
	[UniversalYAxisUnit.MEGABITS_SECOND]: new Set([
		YAxisUnit.AWS_MEGABITS_SECOND,
		YAxisUnit.UCUM_MEGABITS_SECOND,
		YAxisUnit.OPEN_METRICS_MEGABITS_SECOND,
	]),
	[UniversalYAxisUnit.GIGABITS_SECOND]: new Set([
		YAxisUnit.AWS_GIGABITS_SECOND,
		YAxisUnit.UCUM_GIGABITS_SECOND,
		YAxisUnit.OPEN_METRICS_GIGABITS_SECOND,
	]),
	[UniversalYAxisUnit.TERABITS_SECOND]: new Set([
		YAxisUnit.AWS_TERABITS_SECOND,
		YAxisUnit.UCUM_TERABITS_SECOND,
		YAxisUnit.OPEN_METRICS_TERABITS_SECOND,
	]),
	[UniversalYAxisUnit.PETABITS_SECOND]: new Set([
		YAxisUnit.AWS_PETABITS_SECOND,
		YAxisUnit.UCUM_PETABITS_SECOND,
		YAxisUnit.OPEN_METRICS_PETABITS_SECOND,
	]),
	[UniversalYAxisUnit.EXABITS_SECOND]: new Set([
		YAxisUnit.AWS_EXABITS_SECOND,
		YAxisUnit.UCUM_EXABITS_SECOND,
		YAxisUnit.OPEN_METRICS_EXABITS_SECOND,
	]),
	[UniversalYAxisUnit.ZETTABITS_SECOND]: new Set([
		YAxisUnit.AWS_ZETTABITS_SECOND,
		YAxisUnit.UCUM_ZETTABITS_SECOND,
		YAxisUnit.OPEN_METRICS_ZETTABITS_SECOND,
	]),
	[UniversalYAxisUnit.YOTTABITS_SECOND]: new Set([
		YAxisUnit.AWS_YOTTABITS_SECOND,
		YAxisUnit.UCUM_YOTTABITS_SECOND,
		YAxisUnit.OPEN_METRICS_YOTTABITS_SECOND,
	]),

	// Binary (IEC) Bit Rate
	[UniversalYAxisUnit.KIBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_KIBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_KIBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.MEBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_MEBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_MEBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.GIBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_GIBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_GIBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.TEBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_TEBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_TEBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.PEBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_PEBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_PEBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.EXBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_EXBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_EXBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.ZEBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_ZEBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_ZEBIBITS_SECOND,
	]),
	[UniversalYAxisUnit.YOBIBITS_SECOND]: new Set([
		YAxisUnit.UCUM_YOBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_YOBIBITS_SECOND,
	]),

	// Count
	[UniversalYAxisUnit.COUNT]: new Set([
		YAxisUnit.AWS_COUNT,
		YAxisUnit.UCUM_COUNT,
		YAxisUnit.OPEN_METRICS_COUNT,
	]),
	[UniversalYAxisUnit.COUNT_SECOND]: new Set([
		YAxisUnit.AWS_COUNT_SECOND,
		YAxisUnit.UCUM_COUNT_SECOND,
		YAxisUnit.OPEN_METRICS_COUNT_SECOND,
	]),

	// Percent
	[UniversalYAxisUnit.PERCENT]: new Set([
		YAxisUnit.AWS_PERCENT,
		YAxisUnit.UCUM_PERCENT,
		YAxisUnit.OPEN_METRICS_PERCENT,
	]),
	[UniversalYAxisUnit.NONE]: new Set([
		YAxisUnit.AWS_NONE,
		YAxisUnit.UCUM_NONE,
		YAxisUnit.OPEN_METRICS_NONE,
	]),
	[UniversalYAxisUnit.PERCENT_UNIT]: new Set([
		YAxisUnit.OPEN_METRICS_PERCENT_UNIT,
	]),

	// Count Rate
	[UniversalYAxisUnit.COUNT_MINUTE]: new Set([
		YAxisUnit.UCUM_COUNTS_MINUTE,
		YAxisUnit.OPEN_METRICS_COUNTS_MINUTE,
	]),
	[UniversalYAxisUnit.OPS_SECOND]: new Set([
		YAxisUnit.UCUM_OPS_SECOND,
		YAxisUnit.OPEN_METRICS_OPS_SECOND,
	]),
	[UniversalYAxisUnit.OPS_MINUTE]: new Set([
		YAxisUnit.UCUM_OPS_MINUTE,
		YAxisUnit.OPEN_METRICS_OPS_MINUTE,
	]),
	[UniversalYAxisUnit.REQUESTS_SECOND]: new Set([
		YAxisUnit.UCUM_REQUESTS_SECOND,
		YAxisUnit.OPEN_METRICS_REQUESTS_SECOND,
	]),
	[UniversalYAxisUnit.REQUESTS_MINUTE]: new Set([
		YAxisUnit.UCUM_REQUESTS_MINUTE,
		YAxisUnit.OPEN_METRICS_REQUESTS_MINUTE,
	]),
	[UniversalYAxisUnit.READS_SECOND]: new Set([
		YAxisUnit.UCUM_READS_SECOND,
		YAxisUnit.OPEN_METRICS_READS_SECOND,
	]),
	[UniversalYAxisUnit.WRITES_SECOND]: new Set([
		YAxisUnit.UCUM_WRITES_SECOND,
		YAxisUnit.OPEN_METRICS_WRITES_SECOND,
	]),
	[UniversalYAxisUnit.READS_MINUTE]: new Set([
		YAxisUnit.UCUM_READS_MINUTE,
		YAxisUnit.OPEN_METRICS_READS_MINUTE,
	]),
	[UniversalYAxisUnit.WRITES_MINUTE]: new Set([
		YAxisUnit.UCUM_WRITES_MINUTE,
		YAxisUnit.OPEN_METRICS_WRITES_MINUTE,
	]),
	[UniversalYAxisUnit.IOOPS_SECOND]: new Set([
		YAxisUnit.UCUM_IOPS_SECOND,
		YAxisUnit.OPEN_METRICS_IOPS_SECOND,
	]),

	// Boolean
	[UniversalYAxisUnit.TRUE_FALSE]: new Set([
		YAxisUnit.UCUM_TRUE_FALSE,
		YAxisUnit.OPEN_METRICS_TRUE_FALSE,
	]),
	[UniversalYAxisUnit.YES_NO]: new Set([
		YAxisUnit.UCUM_YES_NO,
		YAxisUnit.OPEN_METRICS_YES_NO,
	]),
};

// Mapping of universal y-axis units to their display labels
export const Y_AXIS_UNIT_NAMES: Record<UniversalYAxisUnit, string> = {
	// Time
	[UniversalYAxisUnit.DAYS]: 'Days',
	[UniversalYAxisUnit.HOURS]: 'Hours',
	[UniversalYAxisUnit.MINUTES]: 'Minutes',
	[UniversalYAxisUnit.SECONDS]: 'Seconds (s)',
	[UniversalYAxisUnit.MICROSECONDS]: 'Microseconds (µs)',
	[UniversalYAxisUnit.MILLISECONDS]: 'Milliseconds (ms)',
	[UniversalYAxisUnit.NANOSECONDS]: 'Nanoseconds',
	[UniversalYAxisUnit.DURATION_MS]: 'Duration (ms)',
	[UniversalYAxisUnit.DURATION_S]: 'Duration (s)',
	[UniversalYAxisUnit.DURATION_HMS]: 'Duration (h:m:s)',
	[UniversalYAxisUnit.DURATION_DHMS]: 'Duration (d:h:m:s)',
	[UniversalYAxisUnit.TIMETICKS]: 'Time ticks',
	[UniversalYAxisUnit.CLOCK_MS]: 'Clock (ms)',
	[UniversalYAxisUnit.CLOCK_S]: 'Clock (s)',
	[UniversalYAxisUnit.TIME_HERTZ]: 'Hertz (1/s)',

	// Data
	[UniversalYAxisUnit.BYTES]: 'Bytes (B)',
	[UniversalYAxisUnit.BYTES_IEC]: 'Bytes (B) (IEC)',
	[UniversalYAxisUnit.KILOBYTES]: 'Kilobytes (KB)',
	[UniversalYAxisUnit.MEGABYTES]: 'Megabytes (MB)',
	[UniversalYAxisUnit.GIGABYTES]: 'Gigabytes (GB)',
	[UniversalYAxisUnit.TERABYTES]: 'Terabytes (TB)',
	[UniversalYAxisUnit.PETABYTES]: 'Petabytes (PB)',
	[UniversalYAxisUnit.EXABYTES]: 'Exabytes (EB)',
	[UniversalYAxisUnit.ZETTABYTES]: 'Zettabytes (ZB)',
	[UniversalYAxisUnit.YOTTABYTES]: 'Yottabytes (YB)',

	// Binary (IEC) Data
	[UniversalYAxisUnit.KIBIBYTES]: 'Kibibytes (KiB)',
	[UniversalYAxisUnit.MEBIBYTES]: 'Mebibytes (MiB)',
	[UniversalYAxisUnit.GIBIBYTES]: 'Gibibytes (GiB)',
	[UniversalYAxisUnit.TEBIBYTES]: 'Tebibytes (TiB)',
	[UniversalYAxisUnit.PEBIBYTES]: 'Pebibytes (PiB)',
	[UniversalYAxisUnit.EXBIBYTES]: 'Exbibytes (EiB)',
	[UniversalYAxisUnit.ZEBIBYTES]: 'Zebibytes (ZiB)',
	[UniversalYAxisUnit.YOBIBYTES]: 'Yobibytes (YiB)',

	// Data Rate
	[UniversalYAxisUnit.BYTES_SECOND]: 'Bytes/sec',
	[UniversalYAxisUnit.KILOBYTES_SECOND]: 'Kilobytes/sec',
	[UniversalYAxisUnit.MEGABYTES_SECOND]: 'Megabytes/sec',
	[UniversalYAxisUnit.GIGABYTES_SECOND]: 'Gigabytes/sec',
	[UniversalYAxisUnit.TERABYTES_SECOND]: 'Terabytes/sec',
	[UniversalYAxisUnit.PETABYTES_SECOND]: 'Petabytes/sec',
	[UniversalYAxisUnit.EXABYTES_SECOND]: 'Exabytes/sec',
	[UniversalYAxisUnit.ZETTABYTES_SECOND]: 'Zettabytes/sec',
	[UniversalYAxisUnit.YOTTABYTES_SECOND]: 'Yottabytes/sec',
	[UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND]: 'Packets/sec',

	// Binary (IEC) Data Rate
	[UniversalYAxisUnit.KIBIBYTES_SECOND]: 'Kibibytes/sec (KiB/s)',
	[UniversalYAxisUnit.MEBIBYTES_SECOND]: 'Mebibytes/sec (MiB/s)',
	[UniversalYAxisUnit.GIBIBYTES_SECOND]: 'Gibibytes/sec (GiB/s)',
	[UniversalYAxisUnit.TEBIBYTES_SECOND]: 'Tebibytes/sec (TiB/s)',
	[UniversalYAxisUnit.PEBIBYTES_SECOND]: 'Pebibytes/sec (PiB/s)',
	[UniversalYAxisUnit.EXBIBYTES_SECOND]: 'Exbibytes/sec (EiB/s)',
	[UniversalYAxisUnit.ZEBIBYTES_SECOND]: 'Zebibytes/sec (ZiB/s)',
	[UniversalYAxisUnit.YOBIBYTES_SECOND]: 'Yobibytes/sec (YiB/s)',

	// Bits
	[UniversalYAxisUnit.BITS]: 'Bits (b)',
	[UniversalYAxisUnit.BITS_IEC]: 'Bits (b) (IEC)',
	[UniversalYAxisUnit.KILOBITS]: 'Kilobits (Kb)',
	[UniversalYAxisUnit.MEGABITS]: 'Megabits (Mb)',
	[UniversalYAxisUnit.GIGABITS]: 'Gigabits (Gb)',
	[UniversalYAxisUnit.TERABITS]: 'Terabits (Tb)',
	[UniversalYAxisUnit.PETABITS]: 'Petabits (Pb)',
	[UniversalYAxisUnit.EXABITS]: 'Exabits (Eb)',
	[UniversalYAxisUnit.ZETTABITS]: 'Zettabits (Zb)',
	[UniversalYAxisUnit.YOTTABITS]: 'Yottabits (Yb)',

	// Bit Rate
	[UniversalYAxisUnit.BITS_SECOND]: 'Bits/sec',
	[UniversalYAxisUnit.KILOBITS_SECOND]: 'Kilobits/sec',
	[UniversalYAxisUnit.MEGABITS_SECOND]: 'Megabits/sec',
	[UniversalYAxisUnit.GIGABITS_SECOND]: 'Gigabits/sec',
	[UniversalYAxisUnit.TERABITS_SECOND]: 'Terabits/sec',
	[UniversalYAxisUnit.PETABITS_SECOND]: 'Petabits/sec',
	[UniversalYAxisUnit.EXABITS_SECOND]: 'Exabits/sec',
	[UniversalYAxisUnit.ZETTABITS_SECOND]: 'Zettabits/sec',
	[UniversalYAxisUnit.YOTTABITS_SECOND]: 'Yottabits/sec',

	// Binary (IEC) Bit Rate
	[UniversalYAxisUnit.KIBIBITS_SECOND]: 'Kibibits/sec',
	[UniversalYAxisUnit.MEBIBITS_SECOND]: 'Mebibits/sec',
	[UniversalYAxisUnit.GIBIBITS_SECOND]: 'Gibibits/sec',
	[UniversalYAxisUnit.TEBIBITS_SECOND]: 'Tebibits/sec',
	[UniversalYAxisUnit.PEBIBITS_SECOND]: 'Pebibits/sec',
	[UniversalYAxisUnit.EXBIBITS_SECOND]: 'Exbibits/sec',
	[UniversalYAxisUnit.ZEBIBITS_SECOND]: 'Zebibits/sec',
	[UniversalYAxisUnit.YOBIBITS_SECOND]: 'Yobibits/sec',

	// Count
	[UniversalYAxisUnit.COUNT]: 'Count',
	[UniversalYAxisUnit.COUNT_SECOND]: 'Count/sec',
	[UniversalYAxisUnit.COUNT_MINUTE]: 'Count/min',

	// Operations
	[UniversalYAxisUnit.OPS_SECOND]: 'Ops/sec',
	[UniversalYAxisUnit.OPS_MINUTE]: 'Ops/min',

	// Requests
	[UniversalYAxisUnit.REQUESTS_SECOND]: 'Requests/sec',
	[UniversalYAxisUnit.REQUESTS_MINUTE]: 'Requests/min',

	// Reads/Writes
	[UniversalYAxisUnit.READS_SECOND]: 'Reads/sec',
	[UniversalYAxisUnit.WRITES_SECOND]: 'Writes/sec',
	[UniversalYAxisUnit.READS_MINUTE]: 'Reads/min',
	[UniversalYAxisUnit.WRITES_MINUTE]: 'Writes/min',

	// IO Operations
	[UniversalYAxisUnit.IOOPS_SECOND]: 'IOPS/sec',

	// Percent
	[UniversalYAxisUnit.PERCENT]: 'Percent (0 - 100)',
	[UniversalYAxisUnit.PERCENT_UNIT]: 'Percent (0.0 - 1.0)',

	// Boolean
	[UniversalYAxisUnit.TRUE_FALSE]: 'True / False',
	[UniversalYAxisUnit.YES_NO]: 'Yes / No',
	[UniversalYAxisUnit.ON_OFF]: 'On / Off',

	// Hash Rate
	[UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND]: 'Hashes/sec',
	[UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND]: 'Kilohashes/sec',
	[UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND]: 'Megahashes/sec',
	[UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND]: 'Gigahashes/sec',
	[UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND]: 'Terahashes/sec',
	[UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND]: 'Petahashes/sec',
	[UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND]: 'Exahashes/sec',

	// Miscellaneous
	[UniversalYAxisUnit.MISC_STRING]: 'String',
	[UniversalYAxisUnit.MISC_SHORT]: 'Short',
	[UniversalYAxisUnit.MISC_HUMIDITY]: 'Humidity (%)',
	[UniversalYAxisUnit.MISC_DECIBEL]: 'Decibel (dB)',
	[UniversalYAxisUnit.MISC_HEXADECIMAL]: 'Hexadecimal',
	[UniversalYAxisUnit.MISC_HEXADECIMAL_0X]: 'Hexadecimal (0x)',
	[UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION]: 'Scientific notation',
	[UniversalYAxisUnit.MISC_LOCALE_FORMAT]: 'Locale format',
	[UniversalYAxisUnit.MISC_PIXELS]: 'Pixels',

	// Acceleration
	[UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED]: 'Meters/sec²',
	[UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED]: 'Feet/sec²',
	[UniversalYAxisUnit.ACCELERATION_G_UNIT]: 'G unit',

	// Angular
	[UniversalYAxisUnit.ANGULAR_DEGREE]: 'Degrees (°)',
	[UniversalYAxisUnit.ANGULAR_RADIAN]: 'Radians',
	[UniversalYAxisUnit.ANGULAR_GRADIAN]: 'Gradians',
	[UniversalYAxisUnit.ANGULAR_ARC_MINUTE]: 'Arc minutes',
	[UniversalYAxisUnit.ANGULAR_ARC_SECOND]: 'Arc seconds',

	// Area
	[UniversalYAxisUnit.AREA_SQUARE_METERS]: 'Square meters (m²)',
	[UniversalYAxisUnit.AREA_SQUARE_FEET]: 'Square feet (ft²)',
	[UniversalYAxisUnit.AREA_SQUARE_MILES]: 'Square miles (mi²)',

	// FLOPs
	[UniversalYAxisUnit.FLOPS_FLOPS]: 'FLOPS',
	[UniversalYAxisUnit.FLOPS_MFLOPS]: 'MFLOPS',
	[UniversalYAxisUnit.FLOPS_GFLOPS]: 'GFLOPS',
	[UniversalYAxisUnit.FLOPS_TFLOPS]: 'TFLOPS',
	[UniversalYAxisUnit.FLOPS_PFLOPS]: 'PFLOPS',
	[UniversalYAxisUnit.FLOPS_EFLOPS]: 'EFLOPS',
	[UniversalYAxisUnit.FLOPS_ZFLOPS]: 'ZFLOPS',
	[UniversalYAxisUnit.FLOPS_YFLOPS]: 'YFLOPS',

	// Concentration
	[UniversalYAxisUnit.CONCENTRATION_PPM]: 'Parts per million (ppm)',
	[UniversalYAxisUnit.CONCENTRATION_PPB]: 'Parts per billion (ppb)',
	[UniversalYAxisUnit.CONCENTRATION_NG_M3]: 'Nanogram/m³ (ng/m³)',
	[UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER]:
		'Nanogram/Nm³ (ng/Nm³)',
	[UniversalYAxisUnit.CONCENTRATION_UG_M3]: 'Microgram/m³ (µg/m³)',
	[UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER]:
		'Microgram/Nm³ (µg/Nm³)',
	[UniversalYAxisUnit.CONCENTRATION_MG_M3]: 'Milligram/m³ (mg/m³)',
	[UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER]:
		'Milligram/Nm³ (mg/Nm³)',
	[UniversalYAxisUnit.CONCENTRATION_G_M3]: 'Gram/m³ (g/m³)',
	[UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER]: 'Gram/Nm³ (g/Nm³)',
	[UniversalYAxisUnit.CONCENTRATION_MG_PER_DL]:
		'Milligrams per decilitre (mg/dL)',
	[UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L]: 'Millimoles per litre (mmol/L)',

	// Currency
	[UniversalYAxisUnit.CURRENCY_USD]: 'US Dollar (USD)',
	[UniversalYAxisUnit.CURRENCY_GBP]: 'British Pound (GBP)',
	[UniversalYAxisUnit.CURRENCY_EUR]: 'Euro (EUR)',
	[UniversalYAxisUnit.CURRENCY_JPY]: 'Japanese Yen (JPY)',
	[UniversalYAxisUnit.CURRENCY_RUB]: 'Russian Ruble (RUB)',
	[UniversalYAxisUnit.CURRENCY_UAH]: 'Ukrainian Hryvnia (UAH)',
	[UniversalYAxisUnit.CURRENCY_BRL]: 'Brazilian Real (BRL)',
	[UniversalYAxisUnit.CURRENCY_DKK]: 'Danish Krone (DKK)',
	[UniversalYAxisUnit.CURRENCY_ISK]: 'Icelandic Króna (ISK)',
	[UniversalYAxisUnit.CURRENCY_NOK]: 'Norwegian Krone (NOK)',
	[UniversalYAxisUnit.CURRENCY_SEK]: 'Swedish Krona (SEK)',
	[UniversalYAxisUnit.CURRENCY_CZK]: 'Czech Koruna (CZK)',
	[UniversalYAxisUnit.CURRENCY_CHF]: 'Swiss Franc (CHF)',
	[UniversalYAxisUnit.CURRENCY_PLN]: 'Polish Złoty (PLN)',
	[UniversalYAxisUnit.CURRENCY_BTC]: 'Bitcoin (BTC)',
	[UniversalYAxisUnit.CURRENCY_MBTC]: 'Milli Bitcoin (mBTC)',
	[UniversalYAxisUnit.CURRENCY_UBTC]: 'Micro Bitcoin (µBTC)',
	[UniversalYAxisUnit.CURRENCY_ZAR]: 'South African Rand (ZAR)',
	[UniversalYAxisUnit.CURRENCY_INR]: 'Indian Rupee (INR)',
	[UniversalYAxisUnit.CURRENCY_KRW]: 'South Korean Won (KRW)',
	[UniversalYAxisUnit.CURRENCY_IDR]: 'Indonesian Rupiah (IDR)',
	[UniversalYAxisUnit.CURRENCY_PHP]: 'Philippine Peso (PHP)',
	[UniversalYAxisUnit.CURRENCY_VND]: 'Vietnamese Dong (VND)',

	// Datetime
	[UniversalYAxisUnit.DATETIME_ISO]: 'Datetime ISO',
	[UniversalYAxisUnit.DATETIME_ISO_NO_DATE_IF_TODAY]:
		'Datetime ISO (no date if today)',
	[UniversalYAxisUnit.DATETIME_US]: 'Datetime US',
	[UniversalYAxisUnit.DATETIME_US_NO_DATE_IF_TODAY]:
		'Datetime US (no date if today)',
	[UniversalYAxisUnit.DATETIME_LOCAL]: 'Datetime local',
	[UniversalYAxisUnit.DATETIME_LOCAL_NO_DATE_IF_TODAY]:
		'Datetime local (no date if today)',
	[UniversalYAxisUnit.DATETIME_SYSTEM]: 'Datetime default',
	[UniversalYAxisUnit.DATETIME_FROM_NOW]: 'Relative time (from now)',

	// Power/Electrical
	[UniversalYAxisUnit.POWER_WATT]: 'Watt (W)',
	[UniversalYAxisUnit.POWER_KILOWATT]: 'Kilowatt (kW)',
	[UniversalYAxisUnit.POWER_MEGAWATT]: 'Megawatt (MW)',
	[UniversalYAxisUnit.POWER_GIGAWATT]: 'Gigawatt (GW)',
	[UniversalYAxisUnit.POWER_MILLIWATT]: 'Milliwatt (mW)',
	[UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER]:
		'Watt per square meter (W/m²)',
	[UniversalYAxisUnit.POWER_VOLT_AMPERE]: 'Volt-ampere (VA)',
	[UniversalYAxisUnit.POWER_KILOVOLT_AMPERE]: 'Kilovolt-ampere (kVA)',
	[UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE]: 'Volt-ampere reactive (VAr)',
	[UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE]:
		'Kilovolt-ampere reactive (kVAr)',
	[UniversalYAxisUnit.POWER_WATT_HOUR]: 'Watt-hour (Wh)',
	[UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG]: 'Watt-hour per kilogram (Wh/kg)',
	[UniversalYAxisUnit.POWER_KILOWATT_HOUR]: 'Kilowatt-hour (kWh)',
	[UniversalYAxisUnit.POWER_KILOWATT_MINUTE]: 'Kilowatt-minute (kW min)',
	[UniversalYAxisUnit.POWER_AMPERE_HOUR]: 'Ampere-hour (Ah)',
	[UniversalYAxisUnit.POWER_KILOAMPERE_HOUR]: 'Kiloampere-hour (kAh)',
	[UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR]: 'Milliampere-hour (mAh)',
	[UniversalYAxisUnit.POWER_JOULE]: 'Joule (J)',
	[UniversalYAxisUnit.POWER_ELECTRON_VOLT]: 'Electron volt (eV)',
	[UniversalYAxisUnit.POWER_AMPERE]: 'Ampere (A)',
	[UniversalYAxisUnit.POWER_KILOAMPERE]: 'Kiloampere (kA)',
	[UniversalYAxisUnit.POWER_MILLIAMPERE]: 'Milliampere (mA)',
	[UniversalYAxisUnit.POWER_VOLT]: 'Volt (V)',
	[UniversalYAxisUnit.POWER_KILOVOLT]: 'Kilovolt (kV)',
	[UniversalYAxisUnit.POWER_MILLIVOLT]: 'Millivolt (mV)',
	[UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT]: 'Decibel-milliwatt (dBm)',
	[UniversalYAxisUnit.POWER_OHM]: 'Ohm (Ω)',
	[UniversalYAxisUnit.POWER_KILOOHM]: 'Kilohm (kΩ)',
	[UniversalYAxisUnit.POWER_MEGAOHM]: 'Megohm (MΩ)',
	[UniversalYAxisUnit.POWER_FARAD]: 'Farad (F)',
	[UniversalYAxisUnit.POWER_MICROFARAD]: 'Microfarad (µF)',
	[UniversalYAxisUnit.POWER_NANOFARAD]: 'Nanofarad (nF)',
	[UniversalYAxisUnit.POWER_PICOFARAD]: 'Picofarad (pF)',
	[UniversalYAxisUnit.POWER_FEMTOFARAD]: 'Femtofarad (fF)',
	[UniversalYAxisUnit.POWER_HENRY]: 'Henry (H)',
	[UniversalYAxisUnit.POWER_MILLIHENRY]: 'Millihenry (mH)',
	[UniversalYAxisUnit.POWER_MICROHENRY]: 'Microhenry (µH)',
	[UniversalYAxisUnit.POWER_LUMENS]: 'Lumens (lm)',

	// Flow
	[UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE]: 'Gallons/min (gpm)',
	[UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND]: 'Cubic meters/sec (cms)',
	[UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND]: 'Cubic feet/sec (cfs)',
	[UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE]: 'Cubic feet/min (cfm)',
	[UniversalYAxisUnit.FLOW_LITERS_PER_HOUR]: 'Litres/hour',
	[UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE]: 'Litres/min (L/min)',
	[UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE]: 'Millilitres/min (mL/min)',
	[UniversalYAxisUnit.FLOW_LUX]: 'Lux (lx)',

	// Force
	[UniversalYAxisUnit.FORCE_NEWTON_METERS]: 'Newton-meters (Nm)',
	[UniversalYAxisUnit.FORCE_KILONEWTON_METERS]: 'Kilonewton-meters (kNm)',
	[UniversalYAxisUnit.FORCE_NEWTONS]: 'Newtons (N)',
	[UniversalYAxisUnit.FORCE_KILONEWTONS]: 'Kilonewtons (kN)',

	// Mass
	[UniversalYAxisUnit.MASS_MILLIGRAM]: 'Milligram (mg)',
	[UniversalYAxisUnit.MASS_GRAM]: 'Gram (g)',
	[UniversalYAxisUnit.MASS_POUND]: 'Pound (lb)',
	[UniversalYAxisUnit.MASS_KILOGRAM]: 'Kilogram (kg)',
	[UniversalYAxisUnit.MASS_METRIC_TON]: 'Metric ton (t)',

	// Length
	[UniversalYAxisUnit.LENGTH_MILLIMETER]: 'Millimeter (mm)',
	[UniversalYAxisUnit.LENGTH_INCH]: 'Inch (in)',
	[UniversalYAxisUnit.LENGTH_FOOT]: 'Foot (ft)',
	[UniversalYAxisUnit.LENGTH_METER]: 'Meter (m)',
	[UniversalYAxisUnit.LENGTH_KILOMETER]: 'Kilometer (km)',
	[UniversalYAxisUnit.LENGTH_MILE]: 'Mile (mi)',

	// Pressure
	[UniversalYAxisUnit.PRESSURE_MILLIBAR]: 'Millibar (mbar)',
	[UniversalYAxisUnit.PRESSURE_BAR]: 'Bar (bar)',
	[UniversalYAxisUnit.PRESSURE_KILOBAR]: 'Kilobar (kbar)',
	[UniversalYAxisUnit.PRESSURE_PASCAL]: 'Pascal (Pa)',
	[UniversalYAxisUnit.PRESSURE_HECTOPASCAL]: 'Hectopascal (hPa)',
	[UniversalYAxisUnit.PRESSURE_KILOPASCAL]: 'Kilopascal (kPa)',
	[UniversalYAxisUnit.PRESSURE_INCHES_HG]: 'Inches of mercury (inHg)',
	[UniversalYAxisUnit.PRESSURE_PSI]: 'PSI',

	// Radiation
	[UniversalYAxisUnit.RADIATION_BECQUEREL]: 'Becquerel (Bq)',
	[UniversalYAxisUnit.RADIATION_CURIE]: 'Curie (Ci)',
	[UniversalYAxisUnit.RADIATION_GRAY]: 'Gray (Gy)',
	[UniversalYAxisUnit.RADIATION_RAD]: 'Rad',
	[UniversalYAxisUnit.RADIATION_SIEVERT]: 'Sievert (Sv)',
	[UniversalYAxisUnit.RADIATION_MILLISIEVERT]: 'Millisievert (mSv)',
	[UniversalYAxisUnit.RADIATION_MICROSIEVERT]: 'Microsievert (µSv)',
	[UniversalYAxisUnit.RADIATION_REM]: 'Rem',
	[UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG]: 'Exposure (C/kg)',
	[UniversalYAxisUnit.RADIATION_ROENTGEN]: 'Roentgen (R)',
	[UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR]: 'Sievert/hour (Sv/h)',
	[UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR]:
		'Millisievert/hour (mSv/h)',
	[UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR]:
		'Microsievert/hour (µSv/h)',

	// Rotation speed
	[UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE]:
		'Revolutions per minute (RPM)',
	[UniversalYAxisUnit.ROTATION_SPEED_HERTZ]: 'Hertz (Hz)',
	[UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND]:
		'Radians per second (rad/s)',
	[UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND]:
		'Degrees per second (°/s)',

	// Temperature
	[UniversalYAxisUnit.TEMPERATURE_CELSIUS]: 'Celsius (°C)',
	[UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT]: 'Fahrenheit (°F)',
	[UniversalYAxisUnit.TEMPERATURE_KELVIN]: 'Kelvin (K)',

	// Velocity
	[UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND]: 'Meters/second (m/s)',
	[UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR]: 'Kilometers/hour (km/h)',
	[UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR]: 'Miles/hour (mph)',
	[UniversalYAxisUnit.VELOCITY_KNOT]: 'Knots (kn)',

	// Volume
	[UniversalYAxisUnit.VOLUME_MILLILITER]: 'Millilitre (mL)',
	[UniversalYAxisUnit.VOLUME_LITER]: 'Litre (L)',
	[UniversalYAxisUnit.VOLUME_CUBIC_METER]: 'Cubic meter (m³)',
	[UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER]: 'Normal cubic meter (Nm³)',
	[UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER]: 'Cubic decimeter (dm³)',
	[UniversalYAxisUnit.VOLUME_GALLON]: 'Gallons (gal)',

	// None
	[UniversalYAxisUnit.NONE]: 'None',
};

export const UniversalUnitToGrafanaUnit: Partial<
	Record<UniversalYAxisUnit, string>
> = {
	// Time
	[UniversalYAxisUnit.DAYS]: 'd',
	[UniversalYAxisUnit.HOURS]: 'h',
	[UniversalYAxisUnit.MINUTES]: 'm',
	[UniversalYAxisUnit.SECONDS]: 's',
	[UniversalYAxisUnit.MILLISECONDS]: 'ms',
	[UniversalYAxisUnit.MICROSECONDS]: 'µs',
	[UniversalYAxisUnit.NANOSECONDS]: 'ns',
	[UniversalYAxisUnit.DURATION_MS]: 'dtdurationms',
	[UniversalYAxisUnit.DURATION_S]: 'dtdurations',
	[UniversalYAxisUnit.DURATION_HMS]: 'dthms',
	[UniversalYAxisUnit.DURATION_DHMS]: 'dtdhms',
	[UniversalYAxisUnit.TIMETICKS]: 'timeticks',
	[UniversalYAxisUnit.CLOCK_MS]: 'clockms',
	[UniversalYAxisUnit.CLOCK_S]: 'clocks',
	[UniversalYAxisUnit.TIME_HERTZ]: 'hertz',

	// Data (Grafana uses 1024-based IEC format)
	[UniversalYAxisUnit.BYTES]: 'decbytes',
	[UniversalYAxisUnit.KILOBYTES]: 'deckbytes',
	[UniversalYAxisUnit.MEGABYTES]: 'decmbytes',
	[UniversalYAxisUnit.GIGABYTES]: 'decgbytes',
	[UniversalYAxisUnit.TERABYTES]: 'dectbytes',
	[UniversalYAxisUnit.PETABYTES]: 'decpbytes',

	// Binary (IEC) Data
	[UniversalYAxisUnit.BYTES_IEC]: 'bytes',
	[UniversalYAxisUnit.KIBIBYTES]: 'kbytes',
	[UniversalYAxisUnit.MEBIBYTES]: 'mbytes',
	[UniversalYAxisUnit.GIBIBYTES]: 'gbytes',
	[UniversalYAxisUnit.TEBIBYTES]: 'tbytes',
	[UniversalYAxisUnit.PEBIBYTES]: 'pbytes',

	// Data Rate
	[UniversalYAxisUnit.BYTES_SECOND]: 'Bps',
	[UniversalYAxisUnit.KILOBYTES_SECOND]: 'KBs',
	[UniversalYAxisUnit.MEGABYTES_SECOND]: 'MBs',
	[UniversalYAxisUnit.GIGABYTES_SECOND]: 'GBs',
	[UniversalYAxisUnit.TERABYTES_SECOND]: 'TBs',
	[UniversalYAxisUnit.PETABYTES_SECOND]: 'PBs',
	[UniversalYAxisUnit.DATA_RATE_PACKETS_PER_SECOND]: 'pps',

	// Binary (IEC) Data Rate
	[UniversalYAxisUnit.KIBIBYTES_SECOND]: 'KiBs',
	[UniversalYAxisUnit.MEBIBYTES_SECOND]: 'MiBs',
	[UniversalYAxisUnit.GIBIBYTES_SECOND]: 'GiBs',
	[UniversalYAxisUnit.TEBIBYTES_SECOND]: 'TiBs',
	[UniversalYAxisUnit.PEBIBYTES_SECOND]: 'PiBs',

	// Bits
	[UniversalYAxisUnit.BITS]: 'decbits',
	[UniversalYAxisUnit.BITS_IEC]: 'bits',

	// Bit Rate
	[UniversalYAxisUnit.BITS_SECOND]: 'bps',
	[UniversalYAxisUnit.KILOBITS_SECOND]: 'Kbits',
	[UniversalYAxisUnit.MEGABITS_SECOND]: 'Mbits',
	[UniversalYAxisUnit.GIGABITS_SECOND]: 'Gbits',
	[UniversalYAxisUnit.TERABITS_SECOND]: 'Tbits',
	[UniversalYAxisUnit.PETABITS_SECOND]: 'Pbits',

	// Binary (IEC) Bit Rate
	[UniversalYAxisUnit.KIBIBITS_SECOND]: 'Kibits',
	[UniversalYAxisUnit.MEBIBITS_SECOND]: 'Mibits',
	[UniversalYAxisUnit.GIBIBITS_SECOND]: 'Gibits',
	[UniversalYAxisUnit.TEBIBITS_SECOND]: 'Tibits',
	[UniversalYAxisUnit.PEBIBITS_SECOND]: 'Pibits',

	// Count
	[UniversalYAxisUnit.COUNT]: 'short',
	[UniversalYAxisUnit.COUNT_SECOND]: 'cps',
	[UniversalYAxisUnit.COUNT_MINUTE]: 'cpm',

	// Operations
	[UniversalYAxisUnit.OPS_SECOND]: 'ops',
	[UniversalYAxisUnit.OPS_MINUTE]: 'opm',

	// Requests
	[UniversalYAxisUnit.REQUESTS_SECOND]: 'reqps',
	[UniversalYAxisUnit.REQUESTS_MINUTE]: 'reqpm',

	// Reads/Writes
	[UniversalYAxisUnit.READS_SECOND]: 'rps',
	[UniversalYAxisUnit.WRITES_SECOND]: 'wps',
	[UniversalYAxisUnit.READS_MINUTE]: 'rpm',
	[UniversalYAxisUnit.WRITES_MINUTE]: 'wpm',

	// IO Operations
	[UniversalYAxisUnit.IOOPS_SECOND]: 'iops',

	// Percent
	[UniversalYAxisUnit.PERCENT]: 'percent',
	[UniversalYAxisUnit.PERCENT_UNIT]: 'percentunit',

	// Boolean
	[UniversalYAxisUnit.TRUE_FALSE]: 'bool',
	[UniversalYAxisUnit.YES_NO]: 'bool_yes_no',
	[UniversalYAxisUnit.ON_OFF]: 'bool_on_off',

	// None
	[UniversalYAxisUnit.NONE]: 'none',

	// Hash rate
	[UniversalYAxisUnit.HASH_RATE_HASHES_PER_SECOND]: 'Hs',
	[UniversalYAxisUnit.HASH_RATE_KILOHASHES_PER_SECOND]: 'KHs',
	[UniversalYAxisUnit.HASH_RATE_MEGAHASHES_PER_SECOND]: 'MHs',
	[UniversalYAxisUnit.HASH_RATE_GIGAHASHES_PER_SECOND]: 'GHs',
	[UniversalYAxisUnit.HASH_RATE_TERAHASHES_PER_SECOND]: 'THs',
	[UniversalYAxisUnit.HASH_RATE_PETAHASHES_PER_SECOND]: 'PHs',
	[UniversalYAxisUnit.HASH_RATE_EXAHASHES_PER_SECOND]: 'EHs',

	// Miscellaneous
	[UniversalYAxisUnit.MISC_STRING]: 'string',
	[UniversalYAxisUnit.MISC_SHORT]: 'short',
	[UniversalYAxisUnit.MISC_HUMIDITY]: 'humidity',
	[UniversalYAxisUnit.MISC_DECIBEL]: 'dB',
	[UniversalYAxisUnit.MISC_HEXADECIMAL]: 'hex',
	[UniversalYAxisUnit.MISC_HEXADECIMAL_0X]: 'hex0x',
	[UniversalYAxisUnit.MISC_SCIENTIFIC_NOTATION]: 'sci',
	[UniversalYAxisUnit.MISC_LOCALE_FORMAT]: 'locale',
	[UniversalYAxisUnit.MISC_PIXELS]: 'pixel',

	// Acceleration
	[UniversalYAxisUnit.ACCELERATION_METERS_PER_SECOND_SQUARED]: 'accMS2',
	[UniversalYAxisUnit.ACCELERATION_FEET_PER_SECOND_SQUARED]: 'accFS2',
	[UniversalYAxisUnit.ACCELERATION_G_UNIT]: 'accG',

	// Angular
	[UniversalYAxisUnit.ANGULAR_DEGREE]: 'degree',
	[UniversalYAxisUnit.ANGULAR_RADIAN]: 'radian',
	[UniversalYAxisUnit.ANGULAR_GRADIAN]: 'grad',
	[UniversalYAxisUnit.ANGULAR_ARC_MINUTE]: 'arcmin',
	[UniversalYAxisUnit.ANGULAR_ARC_SECOND]: 'arcsec',

	// Area
	[UniversalYAxisUnit.AREA_SQUARE_METERS]: 'areaM2',
	[UniversalYAxisUnit.AREA_SQUARE_FEET]: 'areaF2',
	[UniversalYAxisUnit.AREA_SQUARE_MILES]: 'areaMI2',

	// FLOPs
	[UniversalYAxisUnit.FLOPS_FLOPS]: 'flops',
	[UniversalYAxisUnit.FLOPS_MFLOPS]: 'mflops',
	[UniversalYAxisUnit.FLOPS_GFLOPS]: 'gflops',
	[UniversalYAxisUnit.FLOPS_TFLOPS]: 'tflops',
	[UniversalYAxisUnit.FLOPS_PFLOPS]: 'pflops',
	[UniversalYAxisUnit.FLOPS_EFLOPS]: 'eflops',
	[UniversalYAxisUnit.FLOPS_ZFLOPS]: 'zflops',
	[UniversalYAxisUnit.FLOPS_YFLOPS]: 'yflops',

	// Concentration
	[UniversalYAxisUnit.CONCENTRATION_PPM]: 'ppm',
	[UniversalYAxisUnit.CONCENTRATION_PPB]: 'conppb',
	[UniversalYAxisUnit.CONCENTRATION_NG_M3]: 'conngm3',
	[UniversalYAxisUnit.CONCENTRATION_NG_NORMAL_CUBIC_METER]: 'conngNm3',
	[UniversalYAxisUnit.CONCENTRATION_UG_M3]: 'con\u03BCgm3',
	[UniversalYAxisUnit.CONCENTRATION_UG_NORMAL_CUBIC_METER]: 'con\u03BCgNm3',
	[UniversalYAxisUnit.CONCENTRATION_MG_M3]: 'conmgm3',
	[UniversalYAxisUnit.CONCENTRATION_MG_NORMAL_CUBIC_METER]: 'conmgNm3',
	[UniversalYAxisUnit.CONCENTRATION_G_M3]: 'congm3',
	[UniversalYAxisUnit.CONCENTRATION_G_NORMAL_CUBIC_METER]: 'congNm3',
	[UniversalYAxisUnit.CONCENTRATION_MG_PER_DL]: 'conmgdL',
	[UniversalYAxisUnit.CONCENTRATION_MMOL_PER_L]: 'conmmolL',

	// Currency
	[UniversalYAxisUnit.CURRENCY_USD]: 'currencyUSD',
	[UniversalYAxisUnit.CURRENCY_GBP]: 'currencyGBP',
	[UniversalYAxisUnit.CURRENCY_EUR]: 'currencyEUR',
	[UniversalYAxisUnit.CURRENCY_JPY]: 'currencyJPY',
	[UniversalYAxisUnit.CURRENCY_RUB]: 'currencyRUB',
	[UniversalYAxisUnit.CURRENCY_UAH]: 'currencyUAH',
	[UniversalYAxisUnit.CURRENCY_BRL]: 'currencyBRL',
	[UniversalYAxisUnit.CURRENCY_DKK]: 'currencyDKK',
	[UniversalYAxisUnit.CURRENCY_ISK]: 'currencyISK',
	[UniversalYAxisUnit.CURRENCY_NOK]: 'currencyNOK',
	[UniversalYAxisUnit.CURRENCY_SEK]: 'currencySEK',
	[UniversalYAxisUnit.CURRENCY_CZK]: 'currencyCZK',
	[UniversalYAxisUnit.CURRENCY_CHF]: 'currencyCHF',
	[UniversalYAxisUnit.CURRENCY_PLN]: 'currencyPLN',
	[UniversalYAxisUnit.CURRENCY_BTC]: 'currencyBTC',
	[UniversalYAxisUnit.CURRENCY_MBTC]: 'currencymBTC',
	[UniversalYAxisUnit.CURRENCY_UBTC]: 'currency\u03BCBTC',
	[UniversalYAxisUnit.CURRENCY_ZAR]: 'currencyZAR',
	[UniversalYAxisUnit.CURRENCY_INR]: 'currencyINR',
	[UniversalYAxisUnit.CURRENCY_KRW]: 'currencyKRW',
	[UniversalYAxisUnit.CURRENCY_IDR]: 'currencyIDR',
	[UniversalYAxisUnit.CURRENCY_PHP]: 'currencyPHP',
	[UniversalYAxisUnit.CURRENCY_VND]: 'currencyVND',

	// Datetime
	[UniversalYAxisUnit.DATETIME_ISO]: 'dateTimeAsIso',
	[UniversalYAxisUnit.DATETIME_ISO_NO_DATE_IF_TODAY]:
		'dateTimeAsIsoNoDateIfToday',
	[UniversalYAxisUnit.DATETIME_US]: 'dateTimeAsUS',
	[UniversalYAxisUnit.DATETIME_US_NO_DATE_IF_TODAY]: 'dateTimeAsUSNoDateIfToday',
	[UniversalYAxisUnit.DATETIME_LOCAL]: 'dateTimeAsLocal',
	[UniversalYAxisUnit.DATETIME_LOCAL_NO_DATE_IF_TODAY]:
		'dateTimeAsLocalNoDateIfToday',
	[UniversalYAxisUnit.DATETIME_SYSTEM]: 'dateTimeAsSystem',
	[UniversalYAxisUnit.DATETIME_FROM_NOW]: 'dateTimeFromNow',

	// Power/Electrical
	[UniversalYAxisUnit.POWER_WATT]: 'watt',
	[UniversalYAxisUnit.POWER_KILOWATT]: 'kwatt',
	[UniversalYAxisUnit.POWER_MEGAWATT]: 'megwatt',
	[UniversalYAxisUnit.POWER_GIGAWATT]: 'gwatt',
	[UniversalYAxisUnit.POWER_MILLIWATT]: 'mwatt',
	[UniversalYAxisUnit.POWER_WATT_PER_SQUARE_METER]: 'Wm2',
	[UniversalYAxisUnit.POWER_VOLT_AMPERE]: 'voltamp',
	[UniversalYAxisUnit.POWER_KILOVOLT_AMPERE]: 'kvoltamp',
	[UniversalYAxisUnit.POWER_VOLT_AMPERE_REACTIVE]: 'voltampreact',
	[UniversalYAxisUnit.POWER_KILOVOLT_AMPERE_REACTIVE]: 'kvoltampreact',
	[UniversalYAxisUnit.POWER_WATT_HOUR]: 'watth',
	[UniversalYAxisUnit.POWER_WATT_HOUR_PER_KG]: 'watthperkg',
	[UniversalYAxisUnit.POWER_KILOWATT_HOUR]: 'kwatth',
	[UniversalYAxisUnit.POWER_KILOWATT_MINUTE]: 'kwattm',
	[UniversalYAxisUnit.POWER_AMPERE_HOUR]: 'amph',
	[UniversalYAxisUnit.POWER_KILOAMPERE_HOUR]: 'kamph',
	[UniversalYAxisUnit.POWER_MILLIAMPERE_HOUR]: 'mamph',
	[UniversalYAxisUnit.POWER_JOULE]: 'joule',
	[UniversalYAxisUnit.POWER_ELECTRON_VOLT]: 'ev',
	[UniversalYAxisUnit.POWER_AMPERE]: 'amp',
	[UniversalYAxisUnit.POWER_KILOAMPERE]: 'kamp',
	[UniversalYAxisUnit.POWER_MILLIAMPERE]: 'mamp',
	[UniversalYAxisUnit.POWER_VOLT]: 'volt',
	[UniversalYAxisUnit.POWER_KILOVOLT]: 'kvolt',
	[UniversalYAxisUnit.POWER_MILLIVOLT]: 'mvolt',
	[UniversalYAxisUnit.POWER_DECIBEL_MILLIWATT]: 'dBm',
	[UniversalYAxisUnit.POWER_OHM]: 'ohm',
	[UniversalYAxisUnit.POWER_KILOOHM]: 'kohm',
	[UniversalYAxisUnit.POWER_MEGAOHM]: 'Mohm',
	[UniversalYAxisUnit.POWER_FARAD]: 'farad',
	[UniversalYAxisUnit.POWER_MICROFARAD]: '\xB5farad',
	[UniversalYAxisUnit.POWER_NANOFARAD]: 'nfarad',
	[UniversalYAxisUnit.POWER_PICOFARAD]: 'pfarad',
	[UniversalYAxisUnit.POWER_FEMTOFARAD]: 'ffarad',
	[UniversalYAxisUnit.POWER_HENRY]: 'henry',
	[UniversalYAxisUnit.POWER_MILLIHENRY]: 'mhenry',
	[UniversalYAxisUnit.POWER_MICROHENRY]: '\xB5henry',
	[UniversalYAxisUnit.POWER_LUMENS]: 'lumens',

	// Flow
	[UniversalYAxisUnit.FLOW_GALLONS_PER_MINUTE]: 'flowgpm',
	[UniversalYAxisUnit.FLOW_CUBIC_METERS_PER_SECOND]: 'flowcms',
	[UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_SECOND]: 'flowcfs',
	[UniversalYAxisUnit.FLOW_CUBIC_FEET_PER_MINUTE]: 'flowcfm',
	[UniversalYAxisUnit.FLOW_LITERS_PER_HOUR]: 'litreh',
	[UniversalYAxisUnit.FLOW_LITERS_PER_MINUTE]: 'flowlpm',
	[UniversalYAxisUnit.FLOW_MILLILITERS_PER_MINUTE]: 'flowmlpm',
	[UniversalYAxisUnit.FLOW_LUX]: 'lux',

	// Force
	[UniversalYAxisUnit.FORCE_NEWTON_METERS]: 'forceNm',
	[UniversalYAxisUnit.FORCE_KILONEWTON_METERS]: 'forcekNm',
	[UniversalYAxisUnit.FORCE_NEWTONS]: 'forceN',
	[UniversalYAxisUnit.FORCE_KILONEWTONS]: 'forcekN',

	// Mass
	[UniversalYAxisUnit.MASS_MILLIGRAM]: 'massmg',
	[UniversalYAxisUnit.MASS_GRAM]: 'massg',
	[UniversalYAxisUnit.MASS_POUND]: 'masslb',
	[UniversalYAxisUnit.MASS_KILOGRAM]: 'masskg',
	[UniversalYAxisUnit.MASS_METRIC_TON]: 'masst',

	// Length
	[UniversalYAxisUnit.LENGTH_MILLIMETER]: 'lengthmm',
	[UniversalYAxisUnit.LENGTH_INCH]: 'lengthin',
	[UniversalYAxisUnit.LENGTH_FOOT]: 'lengthft',
	[UniversalYAxisUnit.LENGTH_METER]: 'lengthm',
	[UniversalYAxisUnit.LENGTH_KILOMETER]: 'lengthkm',
	[UniversalYAxisUnit.LENGTH_MILE]: 'lengthmi',

	// Pressure
	[UniversalYAxisUnit.PRESSURE_MILLIBAR]: 'pressurembar',
	[UniversalYAxisUnit.PRESSURE_BAR]: 'pressurebar',
	[UniversalYAxisUnit.PRESSURE_KILOBAR]: 'pressurekbar',
	[UniversalYAxisUnit.PRESSURE_PASCAL]: 'pressurepa',
	[UniversalYAxisUnit.PRESSURE_HECTOPASCAL]: 'pressurehpa',
	[UniversalYAxisUnit.PRESSURE_KILOPASCAL]: 'pressurekpa',
	[UniversalYAxisUnit.PRESSURE_INCHES_HG]: 'pressurehg',
	[UniversalYAxisUnit.PRESSURE_PSI]: 'pressurepsi',

	// Radiation
	[UniversalYAxisUnit.RADIATION_BECQUEREL]: 'radbq',
	[UniversalYAxisUnit.RADIATION_CURIE]: 'radci',
	[UniversalYAxisUnit.RADIATION_GRAY]: 'radgy',
	[UniversalYAxisUnit.RADIATION_RAD]: 'radrad',
	[UniversalYAxisUnit.RADIATION_SIEVERT]: 'radsv',
	[UniversalYAxisUnit.RADIATION_MILLISIEVERT]: 'radmsv',
	[UniversalYAxisUnit.RADIATION_MICROSIEVERT]: 'radusv',
	[UniversalYAxisUnit.RADIATION_REM]: 'radrem',
	[UniversalYAxisUnit.RADIATION_EXPOSURE_C_PER_KG]: 'radexpckg',
	[UniversalYAxisUnit.RADIATION_ROENTGEN]: 'radr',
	[UniversalYAxisUnit.RADIATION_SIEVERT_PER_HOUR]: 'radsvh',
	[UniversalYAxisUnit.RADIATION_MILLISIEVERT_PER_HOUR]: 'radmsvh',
	[UniversalYAxisUnit.RADIATION_MICROSIEVERT_PER_HOUR]: 'radusvh',

	// Rotation Speed
	[UniversalYAxisUnit.ROTATION_SPEED_REVOLUTIONS_PER_MINUTE]: 'rotrpm',
	[UniversalYAxisUnit.ROTATION_SPEED_HERTZ]: 'rothz',
	[UniversalYAxisUnit.ROTATION_SPEED_RADIANS_PER_SECOND]: 'rotrads',
	[UniversalYAxisUnit.ROTATION_SPEED_DEGREES_PER_SECOND]: 'rotdegs',

	// Temperature
	[UniversalYAxisUnit.TEMPERATURE_CELSIUS]: 'celsius',
	[UniversalYAxisUnit.TEMPERATURE_FAHRENHEIT]: 'fahrenheit',
	[UniversalYAxisUnit.TEMPERATURE_KELVIN]: 'kelvin',

	// Velocity
	[UniversalYAxisUnit.VELOCITY_METERS_PER_SECOND]: 'velocityms',
	[UniversalYAxisUnit.VELOCITY_KILOMETERS_PER_HOUR]: 'velocitykmh',
	[UniversalYAxisUnit.VELOCITY_MILES_PER_HOUR]: 'velocitymph',
	[UniversalYAxisUnit.VELOCITY_KNOT]: 'velocityknot',

	// Volume
	[UniversalYAxisUnit.VOLUME_MILLILITER]: 'mlitre',
	[UniversalYAxisUnit.VOLUME_LITER]: 'litre',
	[UniversalYAxisUnit.VOLUME_CUBIC_METER]: 'm3',
	[UniversalYAxisUnit.VOLUME_NORMAL_CUBIC_METER]: 'Nm3',
	[UniversalYAxisUnit.VOLUME_CUBIC_DECIMETER]: 'dm3',
	[UniversalYAxisUnit.VOLUME_GALLON]: 'gallons',
};

export const AdditionalLabelsMappingForGrafanaUnits: Partial<
	Record<UniversalYAxisUnit, string>
> = {
	// Data
	[UniversalYAxisUnit.EXABYTES]: 'EB',
	[UniversalYAxisUnit.ZETTABYTES]: 'ZB',
	[UniversalYAxisUnit.YOTTABYTES]: 'YB',

	// Binary (IEC) Data
	[UniversalYAxisUnit.EXBIBYTES]: 'EiB',
	[UniversalYAxisUnit.ZEBIBYTES]: 'ZiB',
	[UniversalYAxisUnit.YOBIBYTES]: 'YiB',

	// Data Rate
	[UniversalYAxisUnit.EXABYTES_SECOND]: 'EB/s',
	[UniversalYAxisUnit.ZETTABYTES_SECOND]: 'ZB/s',
	[UniversalYAxisUnit.YOTTABYTES_SECOND]: 'YB/s',

	// Binary (IEC) Data Rate
	[UniversalYAxisUnit.EXBIBYTES_SECOND]: 'EiB/s',
	[UniversalYAxisUnit.ZEBIBYTES_SECOND]: 'ZiB/s',
	[UniversalYAxisUnit.YOBIBYTES_SECOND]: 'YiB/s',

	// Bits
	[UniversalYAxisUnit.BITS]: 'b',
	[UniversalYAxisUnit.KILOBITS]: 'kb',
	[UniversalYAxisUnit.MEGABITS]: 'Mb',
	[UniversalYAxisUnit.GIGABITS]: 'Gb',
	[UniversalYAxisUnit.TERABITS]: 'Tb',
	[UniversalYAxisUnit.PETABITS]: 'Pb',
	[UniversalYAxisUnit.EXABITS]: 'Eb',
	[UniversalYAxisUnit.ZETTABITS]: 'Zb',
	[UniversalYAxisUnit.YOTTABITS]: 'Yb',

	// Bit Rate
	[UniversalYAxisUnit.EXABITS_SECOND]: 'Eb/s',
	[UniversalYAxisUnit.ZETTABITS_SECOND]: 'Zb/s',
	[UniversalYAxisUnit.YOTTABITS_SECOND]: 'Yb/s',

	// Binary (IEC) Bit Rate
	[UniversalYAxisUnit.EXBIBITS_SECOND]: 'Eib/s',
	[UniversalYAxisUnit.ZEBIBITS_SECOND]: 'Zib/s',
	[UniversalYAxisUnit.YOBIBITS_SECOND]: 'Yib/s',
};

/**
 * Configuration for unit families that need custom scaling
 * These are units where Grafana doesn't auto-scale between levels
 */
export const CUSTOM_SCALING_FAMILIES: UnitFamilyConfig[] = [
	// Bits (b → kb → Mb → Gb → Tb → Pb → Eb → Zb → Yb)
	{
		units: [
			UniversalYAxisUnit.BITS,
			UniversalYAxisUnit.KILOBITS,
			UniversalYAxisUnit.MEGABITS,
			UniversalYAxisUnit.GIGABITS,
			UniversalYAxisUnit.TERABITS,
			UniversalYAxisUnit.PETABITS,
			UniversalYAxisUnit.EXABITS,
			UniversalYAxisUnit.ZETTABITS,
			UniversalYAxisUnit.YOTTABITS,
		],
		scaleFactor: 1000,
	},
	// High-order bit rates (Eb/s → Zb/s → Yb/s)
	{
		units: [
			UniversalYAxisUnit.EXABITS_SECOND,
			UniversalYAxisUnit.ZETTABITS_SECOND,
			UniversalYAxisUnit.YOTTABITS_SECOND,
		],
		scaleFactor: 1000,
	},
	// High-order bytes (EB → ZB → YB)
	{
		units: [
			UniversalYAxisUnit.EXABYTES,
			UniversalYAxisUnit.ZETTABYTES,
			UniversalYAxisUnit.YOTTABYTES,
		],
		scaleFactor: 1000,
	},
	// High-order byte rates (EB/s → ZB/s → YB/s)
	{
		units: [
			UniversalYAxisUnit.EXABYTES_SECOND,
			UniversalYAxisUnit.ZETTABYTES_SECOND,
			UniversalYAxisUnit.YOTTABYTES_SECOND,
		],
		scaleFactor: 1000,
	},
	// High-order binary bytes (EiB → ZiB → YiB)
	{
		units: [
			UniversalYAxisUnit.EXBIBYTES,
			UniversalYAxisUnit.ZEBIBYTES,
			UniversalYAxisUnit.YOBIBYTES,
		],
		scaleFactor: 1024,
	},
	// High-order binary byte rates (EiB/s → ZiB/s → YiB/s)
	{
		units: [
			UniversalYAxisUnit.EXBIBYTES_SECOND,
			UniversalYAxisUnit.ZEBIBYTES_SECOND,
			UniversalYAxisUnit.YOBIBYTES_SECOND,
		],
		scaleFactor: 1024,
	},
	// High-order binary bit rates (Eibit/s → Zibit/s → Yibit/s)
	{
		units: [
			UniversalYAxisUnit.EXBIBITS_SECOND,
			UniversalYAxisUnit.ZEBIBITS_SECOND,
			UniversalYAxisUnit.YOBIBITS_SECOND,
		],
		scaleFactor: 1024,
	},
];

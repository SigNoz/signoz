import { UniversalYAxisUnit, YAxisUnit } from './types';

// Mapping of universal y-axis units to their AWS, UCUM, and OpenMetrics equivalents
export const UniversalYAxisUnitMappings: Record<
	UniversalYAxisUnit,
	Set<YAxisUnit>
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
	[UniversalYAxisUnit.WEEKS]: new Set([YAxisUnit.UCUM_WEEKS]),

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
};

// Mapping of universal y-axis units to their display labels
export const Y_AXIS_UNIT_NAMES: Record<UniversalYAxisUnit, string> = {
	[UniversalYAxisUnit.SECONDS]: 'Seconds (s)',
	[UniversalYAxisUnit.MILLISECONDS]: 'Milliseconds (ms)',
	[UniversalYAxisUnit.MICROSECONDS]: 'Microseconds (µs)',
	[UniversalYAxisUnit.BYTES]: 'Bytes (B)',
	[UniversalYAxisUnit.KILOBYTES]: 'Kilobytes (KB)',
	[UniversalYAxisUnit.MEGABYTES]: 'Megabytes (MB)',
	[UniversalYAxisUnit.GIGABYTES]: 'Gigabytes (GB)',
	[UniversalYAxisUnit.TERABYTES]: 'Terabytes (TB)',
	[UniversalYAxisUnit.PETABYTES]: 'Petabytes (PB)',
	[UniversalYAxisUnit.EXABYTES]: 'Exabytes (EB)',
	[UniversalYAxisUnit.ZETTABYTES]: 'Zettabytes (ZB)',
	[UniversalYAxisUnit.YOTTABYTES]: 'Yottabytes (YB)',
	[UniversalYAxisUnit.BITS]: 'Bits (b)',
	[UniversalYAxisUnit.KILOBITS]: 'Kilobits (Kb)',
	[UniversalYAxisUnit.MEGABITS]: 'Megabits (Mb)',
	[UniversalYAxisUnit.GIGABITS]: 'Gigabits (Gb)',
	[UniversalYAxisUnit.TERABITS]: 'Terabits (Tb)',
	[UniversalYAxisUnit.PETABITS]: 'Petabits (Pb)',
	[UniversalYAxisUnit.EXABITS]: 'Exabits (Eb)',
	[UniversalYAxisUnit.ZETTABITS]: 'Zettabits (Zb)',
	[UniversalYAxisUnit.YOTTABITS]: 'Yottabits (Yb)',
	[UniversalYAxisUnit.BYTES_SECOND]: 'Bytes/sec',
	[UniversalYAxisUnit.KILOBYTES_SECOND]: 'Kilobytes/sec',
	[UniversalYAxisUnit.MEGABYTES_SECOND]: 'Megabytes/sec',
	[UniversalYAxisUnit.GIGABYTES_SECOND]: 'Gigabytes/sec',
	[UniversalYAxisUnit.TERABYTES_SECOND]: 'Terabytes/sec',
	[UniversalYAxisUnit.PETABYTES_SECOND]: 'Petabytes/sec',
	[UniversalYAxisUnit.EXABYTES_SECOND]: 'Exabytes/sec',
	[UniversalYAxisUnit.ZETTABYTES_SECOND]: 'Zettabytes/sec',
	[UniversalYAxisUnit.YOTTABYTES_SECOND]: 'Yottabytes/sec',
	[UniversalYAxisUnit.BITS_SECOND]: 'Bits/sec',
	[UniversalYAxisUnit.KILOBITS_SECOND]: 'Kilobits/sec',
	[UniversalYAxisUnit.MEGABITS_SECOND]: 'Megabits/sec',
	[UniversalYAxisUnit.GIGABITS_SECOND]: 'Gigabits/sec',
	[UniversalYAxisUnit.TERABITS_SECOND]: 'Terabits/sec',
	[UniversalYAxisUnit.PETABITS_SECOND]: 'Petabits/sec',
	[UniversalYAxisUnit.EXABITS_SECOND]: 'Exabits/sec',
	[UniversalYAxisUnit.ZETTABITS_SECOND]: 'Zettabits/sec',
	[UniversalYAxisUnit.YOTTABITS_SECOND]: 'Yottabits/sec',
	[UniversalYAxisUnit.COUNT]: 'Count',
	[UniversalYAxisUnit.COUNT_SECOND]: 'Count/sec',
	[UniversalYAxisUnit.PERCENT]: 'Percent (0 - 100)',
	[UniversalYAxisUnit.NONE]: 'None',
	[UniversalYAxisUnit.WEEKS]: 'Weeks',
	[UniversalYAxisUnit.DAYS]: 'Days',
	[UniversalYAxisUnit.HOURS]: 'Hours',
	[UniversalYAxisUnit.MINUTES]: 'Minutes',
	[UniversalYAxisUnit.NANOSECONDS]: 'Nanoseconds',
	[UniversalYAxisUnit.COUNT_MINUTE]: 'Count/min',
	[UniversalYAxisUnit.OPS_SECOND]: 'Ops/sec',
	[UniversalYAxisUnit.OPS_MINUTE]: 'Ops/min',
	[UniversalYAxisUnit.REQUESTS_SECOND]: 'Requests/sec',
	[UniversalYAxisUnit.REQUESTS_MINUTE]: 'Requests/min',
	[UniversalYAxisUnit.READS_SECOND]: 'Reads/sec',
	[UniversalYAxisUnit.WRITES_SECOND]: 'Writes/sec',
	[UniversalYAxisUnit.READS_MINUTE]: 'Reads/min',
	[UniversalYAxisUnit.WRITES_MINUTE]: 'Writes/min',
	[UniversalYAxisUnit.IOOPS_SECOND]: 'IOPS/sec',
	[UniversalYAxisUnit.PERCENT_UNIT]: 'Percent (0.0 - 1.0)',
};

// Splitting the universal y-axis units into categories
export const Y_AXIS_CATEGORIES = [
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
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.WEEKS],
				id: UniversalYAxisUnit.WEEKS,
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
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.BITS],
				id: UniversalYAxisUnit.BITS,
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
];

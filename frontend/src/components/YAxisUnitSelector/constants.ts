import { UniversalYAxisUnit, YAxisUnit } from './types';

export const UniversalYAxisUnitMappings: Record<
	UniversalYAxisUnit,
	Set<YAxisUnit>
> = {
	[UniversalYAxisUnit.SECONDS]: new Set([
		YAxisUnit.AWS_SECONDS,
		YAxisUnit.UCUM_SECONDS,
		YAxisUnit.OPEN_METRICS_SECONDS,
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
	[UniversalYAxisUnit.DAYS]: new Set([
		YAxisUnit.UCUM_DAYS,
		YAxisUnit.OPEN_METRICS_DAYS,
	]),
	[UniversalYAxisUnit.HOURS]: new Set([
		YAxisUnit.UCUM_HOURS,
		YAxisUnit.OPEN_METRICS_HOURS,
	]),
	[UniversalYAxisUnit.MINUTES]: new Set([
		YAxisUnit.UCUM_MINUTES,
		YAxisUnit.OPEN_METRICS_MINUTES,
	]),
	[UniversalYAxisUnit.NANOSECONDS]: new Set([
		YAxisUnit.UCUM_NANOSECONDS,
		YAxisUnit.OPEN_METRICS_NANOSECONDS,
	]),
	[UniversalYAxisUnit.PETABYTES]: new Set([
		YAxisUnit.UCUM_PEBIBYTES,
		YAxisUnit.OPEN_METRICS_PEBIBYTES,
	]),
	[UniversalYAxisUnit.PETABYTES_SECOND]: new Set([
		YAxisUnit.UCUM_PEBIBYTES_SECOND,
		YAxisUnit.OPEN_METRICS_PEBIBYTES_SECOND,
	]),
	[UniversalYAxisUnit.PETABITS]: new Set([YAxisUnit.UCUM_PETABITS]),
	[UniversalYAxisUnit.PETABITS_SECOND]: new Set([
		YAxisUnit.UCUM_PEBIBITS_SECOND,
		YAxisUnit.OPEN_METRICS_PEBIBITS_SECOND,
	]),
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

export const Y_AXIS_UNIT_NAMES: Record<UniversalYAxisUnit, string> = {
	[UniversalYAxisUnit.SECONDS]: 'Seconds (s)',
	[UniversalYAxisUnit.MILLISECONDS]: 'Milliseconds (ms)',
	[UniversalYAxisUnit.MICROSECONDS]: 'Microseconds (µs)',
	[UniversalYAxisUnit.BYTES]: 'Bytes (B)',
	[UniversalYAxisUnit.KILOBYTES]: 'Kilobytes (KB)',
	[UniversalYAxisUnit.MEGABYTES]: 'Megabytes (MB)',
	[UniversalYAxisUnit.GIGABYTES]: 'Gigabytes (GB)',
	[UniversalYAxisUnit.TERABYTES]: 'Terabytes (TB)',
	[UniversalYAxisUnit.BITS]: 'Bits (b)',
	[UniversalYAxisUnit.KILOBITS]: 'Kilobits (Kb)',
	[UniversalYAxisUnit.MEGABITS]: 'Megabits (Mb)',
	[UniversalYAxisUnit.GIGABITS]: 'Gigabits (Gb)',
	[UniversalYAxisUnit.TERABITS]: 'Terabits (Tb)',
	[UniversalYAxisUnit.BYTES_SECOND]: 'Bytes/sec',
	[UniversalYAxisUnit.KILOBYTES_SECOND]: 'Kilobytes/sec',
	[UniversalYAxisUnit.MEGABYTES_SECOND]: 'Megabytes/sec',
	[UniversalYAxisUnit.GIGABYTES_SECOND]: 'Gigabytes/sec',
	[UniversalYAxisUnit.TERABYTES_SECOND]: 'Terabytes/sec',
	[UniversalYAxisUnit.BITS_SECOND]: 'Bits/sec',
	[UniversalYAxisUnit.KILOBITS_SECOND]: 'Kilobits/sec',
	[UniversalYAxisUnit.MEGABITS_SECOND]: 'Megabits/sec',
	[UniversalYAxisUnit.GIGABITS_SECOND]: 'Gigabits/sec',
	[UniversalYAxisUnit.TERABITS_SECOND]: 'Terabits/sec',
	[UniversalYAxisUnit.COUNT]: 'Count',
	[UniversalYAxisUnit.COUNT_SECOND]: 'Count/sec',
	[UniversalYAxisUnit.PERCENT]: 'Percent (%)',
	[UniversalYAxisUnit.NONE]: 'None',
	[UniversalYAxisUnit.DAYS]: 'Days',
	[UniversalYAxisUnit.HOURS]: 'Hours',
	[UniversalYAxisUnit.MINUTES]: 'Minutes',
	[UniversalYAxisUnit.NANOSECONDS]: 'Nanoseconds',
	[UniversalYAxisUnit.PETABYTES]: 'Petabytes',
	[UniversalYAxisUnit.PETABYTES_SECOND]: 'Petabytes/sec',
	[UniversalYAxisUnit.PETABITS]: 'Petabits',
	[UniversalYAxisUnit.PETABITS_SECOND]: 'Petabits/sec',
	[UniversalYAxisUnit.COUNT_MINUTE]: 'Count/min',
	[UniversalYAxisUnit.OPS_SECOND]: 'Ops/sec',
	[UniversalYAxisUnit.OPS_MINUTE]: 'Ops/min',
	[UniversalYAxisUnit.REQUESTS_SECOND]: 'Requests/sec',
	[UniversalYAxisUnit.READS_SECOND]: 'Reads/sec',
	[UniversalYAxisUnit.WRITES_SECOND]: 'Writes/sec',
	[UniversalYAxisUnit.READS_MINUTE]: 'Reads/min',
	[UniversalYAxisUnit.WRITES_MINUTE]: 'Writes/min',
	[UniversalYAxisUnit.IOOPS_SECOND]: 'IOPS/sec',
};

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
		],
	},
	{
		name: 'Miscellaneous',
		units: [
			{
				name: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.NONE],
				id: UniversalYAxisUnit.NONE,
			},
		],
	},
];

export const UniversalUnitToGrafanaUnit: Record<UniversalYAxisUnit, string> = {
	// Time
	[UniversalYAxisUnit.DAYS]: 'd',
	[UniversalYAxisUnit.HOURS]: 'h',
	[UniversalYAxisUnit.MINUTES]: 'm',
	[UniversalYAxisUnit.SECONDS]: 's',
	[UniversalYAxisUnit.MILLISECONDS]: 'ms',
	[UniversalYAxisUnit.MICROSECONDS]: 'µs',
	[UniversalYAxisUnit.NANOSECONDS]: 'ns',

	// Data (Grafana uses 1024-based IEC format)
	[UniversalYAxisUnit.BYTES]: 'bytes',
	[UniversalYAxisUnit.KILOBYTES]: 'bytes',
	[UniversalYAxisUnit.MEGABYTES]: 'bytes',
	[UniversalYAxisUnit.GIGABYTES]: 'bytes',
	[UniversalYAxisUnit.TERABYTES]: 'bytes',
	[UniversalYAxisUnit.PETABYTES]: 'bytes',

	// Data Rate
	[UniversalYAxisUnit.BYTES_SECOND]: 'Bps',
	[UniversalYAxisUnit.KILOBYTES_SECOND]: 'KBs',
	[UniversalYAxisUnit.MEGABYTES_SECOND]: 'MBs',
	[UniversalYAxisUnit.GIGABYTES_SECOND]: 'GBs',
	[UniversalYAxisUnit.TERABYTES_SECOND]: 'TBs',
	[UniversalYAxisUnit.PETABYTES_SECOND]: 'PBs',

	// Bits
	[UniversalYAxisUnit.BITS]: 'bits',
	[UniversalYAxisUnit.KILOBITS]: 'bits',
	[UniversalYAxisUnit.MEGABITS]: 'bits',
	[UniversalYAxisUnit.GIGABITS]: 'bits',
	[UniversalYAxisUnit.TERABITS]: 'bits',
	[UniversalYAxisUnit.PETABITS]: 'bits',

	// Bit Rate
	[UniversalYAxisUnit.BITS_SECOND]: 'bps',
	[UniversalYAxisUnit.KILOBITS_SECOND]: 'bps',
	[UniversalYAxisUnit.MEGABITS_SECOND]: 'bps',
	[UniversalYAxisUnit.GIGABITS_SECOND]: 'bps',
	[UniversalYAxisUnit.TERABITS_SECOND]: 'bps',
	[UniversalYAxisUnit.PETABITS_SECOND]: 'bps',

	// Count
	[UniversalYAxisUnit.COUNT]: 'short',
	[UniversalYAxisUnit.COUNT_SECOND]: 'cps',
	[UniversalYAxisUnit.COUNT_MINUTE]: 'cpm',

	// Operations
	[UniversalYAxisUnit.OPS_SECOND]: 'ops',
	[UniversalYAxisUnit.OPS_MINUTE]: 'opm',

	// Requests
	[UniversalYAxisUnit.REQUESTS_SECOND]: 'reqps',

	// Reads/Writes
	[UniversalYAxisUnit.READS_SECOND]: 'rps',
	[UniversalYAxisUnit.WRITES_SECOND]: 'wps',
	[UniversalYAxisUnit.READS_MINUTE]: 'rpm',
	[UniversalYAxisUnit.WRITES_MINUTE]: 'wpm',

	// IO Operations
	[UniversalYAxisUnit.IOOPS_SECOND]: 'iops',

	// Percent
	[UniversalYAxisUnit.PERCENT]: 'percent',

	// None
	[UniversalYAxisUnit.NONE]: 'none',
};

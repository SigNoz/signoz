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

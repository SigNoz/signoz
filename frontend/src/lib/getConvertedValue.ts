import {
	UniversalUnitToGrafanaUnit,
	Y_AXIS_UNIT_NAMES,
} from 'components/YAxisUnitSelector/constants';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { isUniversalUnit } from 'components/YAxisUnitSelector/utils';

// 1 byte = 8 bits
// Or 1 bit = 1/8 bytes
const BIT_FACTOR = 1 / 8;

const DECIMAL_FACTOR = 1000;
const BINARY_FACTOR = 1024;

const unitsMapping = [
	{
		label: 'Data',
		options: [
			{
				label: 'bytes(IEC)',
				value: 'bytes',
				factor: 1,
			},
			{
				label: 'bytes(SI)',
				value: 'decbytes',
				factor: 1,
			},
			{
				label: 'bits(IEC)',
				value: 'bits',
				factor: BIT_FACTOR,
			},
			{
				label: 'bits(SI)',
				value: 'decbits',
				factor: BIT_FACTOR,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.KILOBITS],
				value: UniversalYAxisUnit.KILOBITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.MEGABITS],
				value: UniversalYAxisUnit.MEGABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 2,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.GIGABITS],
				value: UniversalYAxisUnit.GIGABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 3,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.TERABITS],
				value: UniversalYAxisUnit.TERABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 4,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.PETABITS],
				value: UniversalYAxisUnit.PETABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 5,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABITS],
				value: UniversalYAxisUnit.EXABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABITS],
				value: UniversalYAxisUnit.ZETTABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABITS],
				value: UniversalYAxisUnit.YOTTABITS,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 8,
			},
			{
				label: 'kibibytes',
				value: 'kbytes',
				factor: BINARY_FACTOR,
			},
			{
				label: 'kilobytes',
				value: 'deckbytes',
				factor: DECIMAL_FACTOR,
			},
			{
				label: 'mebibytes',
				value: 'mbytes',
				factor: BINARY_FACTOR ** 2,
			},
			{
				label: 'megabytes',
				value: 'decmbytes',
				factor: DECIMAL_FACTOR ** 2,
			},
			{
				label: 'gibibytes',
				value: 'gbytes',
				factor: BINARY_FACTOR ** 3,
			},
			{
				label: 'gigabytes',
				value: 'decgbytes',
				factor: DECIMAL_FACTOR ** 3,
			},
			{
				label: 'tebibytes',
				value: 'tbytes',
				factor: BINARY_FACTOR ** 4,
			},
			{
				label: 'terabytes',
				value: 'dectbytes',
				factor: DECIMAL_FACTOR ** 4,
			},
			{
				label: 'pebibytes',
				value: 'pbytes',
				factor: BINARY_FACTOR ** 5,
			},
			{
				label: 'petabytes',
				value: 'decpbytes',
				factor: DECIMAL_FACTOR ** 5,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABYTES],
				value: UniversalYAxisUnit.EXABYTES,
				factor: DECIMAL_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXBIBYTES],
				value: UniversalYAxisUnit.EXBIBYTES,
				factor: BINARY_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABYTES],
				value: UniversalYAxisUnit.ZETTABYTES,
				factor: DECIMAL_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZEBIBYTES],
				value: UniversalYAxisUnit.ZEBIBYTES,
				factor: BINARY_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABYTES],
				value: UniversalYAxisUnit.YOTTABYTES,
				factor: DECIMAL_FACTOR ** 8,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOBIBYTES],
				value: UniversalYAxisUnit.YOBIBYTES,
				factor: BINARY_FACTOR ** 8,
			},
		],
	},
	{
		label: 'DataRate',
		options: [
			{
				label: 'bytes/sec(IEC)',
				value: 'binBps',
				factor: 1,
			},
			{
				label: 'bytes/sec(SI)',
				value: 'Bps',
				factor: 1,
			},
			{
				label: 'bits/sec(IEC)',
				value: 'binbps',
				factor: BIT_FACTOR, // 1 byte = 8 bits
			},
			{
				label: 'bits/sec(SI)',
				value: 'bps',
				factor: BIT_FACTOR, // 1 byte = 8 bits
			},
			{
				label: 'kibibytes/sec',
				value: 'KiBs',
				factor: BINARY_FACTOR,
			},
			{
				label: 'kibibits/sec',
				value: 'Kibits',
				factor: BIT_FACTOR * BINARY_FACTOR, // 1 KiB = 8 Kibits
			},
			{
				label: 'kilobytes/sec',
				value: 'KBs',
				factor: DECIMAL_FACTOR,
			},
			{
				label: 'kilobits/sec',
				value: 'Kbits',
				factor: BIT_FACTOR * DECIMAL_FACTOR, // 1 KB = 8 Kbits
			},
			{
				label: 'mebibytes/sec',
				value: 'MiBs',
				factor: BINARY_FACTOR ** 2,
			},
			{
				label: 'mebibits/sec',
				value: 'Mibits',
				factor: BIT_FACTOR * BINARY_FACTOR ** 2, // 1 MiB = 8 Mibits
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABYTES_SECOND],
				value: UniversalYAxisUnit.EXABYTES_SECOND,
				factor: DECIMAL_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABYTES_SECOND],
				value: UniversalYAxisUnit.ZETTABYTES_SECOND,
				factor: DECIMAL_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABYTES_SECOND],
				value: UniversalYAxisUnit.YOTTABYTES_SECOND,
				factor: DECIMAL_FACTOR ** 8,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXBIBYTES_SECOND],
				value: UniversalYAxisUnit.EXBIBYTES_SECOND,
				factor: BINARY_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZEBIBYTES_SECOND],
				value: UniversalYAxisUnit.ZEBIBYTES_SECOND,
				factor: BINARY_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOBIBYTES_SECOND],
				value: UniversalYAxisUnit.YOBIBYTES_SECOND,
				factor: BINARY_FACTOR ** 8,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXABITS_SECOND],
				value: UniversalYAxisUnit.EXABITS_SECOND,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZETTABITS_SECOND],
				value: UniversalYAxisUnit.ZETTABITS_SECOND,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOTTABITS_SECOND],
				value: UniversalYAxisUnit.YOTTABITS_SECOND,
				factor: BIT_FACTOR * DECIMAL_FACTOR ** 8,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.EXBIBITS_SECOND],
				value: UniversalYAxisUnit.EXBIBITS_SECOND,
				factor: BIT_FACTOR * BINARY_FACTOR ** 6,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.ZEBIBITS_SECOND],
				value: UniversalYAxisUnit.ZEBIBITS_SECOND,
				factor: BIT_FACTOR * BINARY_FACTOR ** 7,
			},
			{
				label: Y_AXIS_UNIT_NAMES[UniversalYAxisUnit.YOBIBITS_SECOND],
				value: UniversalYAxisUnit.YOBIBITS_SECOND,
				factor: BIT_FACTOR * BINARY_FACTOR ** 8,
			},
		],
	},
	{
		label: 'Time',
		options: [
			{
				label: 'nanoseconds (ns)',
				value: 'ns',
				factor: 1,
			},
			{
				label: 'microseconds (µs)',
				value: 'µs',
				factor: 1000, // 1 ms = 1000 µs
			},
			{
				label: 'milliseconds (ms)',
				value: 'ms',
				factor: 1000 * 1000, // 1 s = 1000 ms
			},
			{
				label: 'seconds (s)',
				value: 's',
				factor: 1000 * 1000 * 1000, // 1 s = 1000 ms
			},
			{
				label: 'minutes (m)',
				value: 'm',
				factor: 60 * 1000 * 1000 * 1000, // 1 m = 60 s
			},
			{
				label: 'hours (h)',
				value: 'h',
				factor: 60 * 60 * 1000 * 1000 * 1000, // 1 h = 60 m
			},
			{
				label: 'days (d)',
				value: 'd',
				factor: 24 * 60 * 60 * 1000 * 1000 * 1000, // 1 d = 24 h
			},
		],
	},
	{
		label: 'Throughput',
		options: [
			{
				label: 'counts/sec (cps)',
				value: 'cps',
				factor: 1,
			},
			{
				label: 'ops/sec (ops)',
				value: 'ops',
				factor: 1,
			},
			{
				label: 'requests/sec (reqps)',
				value: 'reqps',
				factor: 1,
			},
			{
				label: 'reads/sec (rps)',
				value: 'rps',
				factor: 1,
			},
			{
				label: 'writes/sec (wps)',
				value: 'wps',
				factor: 1,
			},
			{
				label: 'I/O operations/sec (iops)',
				value: 'iops',
				factor: 1,
			},
			{
				label: 'counts/min (cpm)',
				value: 'cpm',
				factor: 60, // 1 cpm = 60 cps
			},
			{
				label: 'ops/min (opm)',
				value: 'opm',
				factor: 60, // 1 opm = 60 ops
			},
			{
				label: 'reads/min (rpm)',
				value: 'rpm',
				factor: 60, // 1 rpm = 60 rps
			},
			{
				label: 'writes/min (wpm)',
				value: 'wpm',
				factor: 60, // 1 wpm = 60 wps
			},
			// ... (other options)
		],
	},
	{
		label: 'Miscellaneous',
		options: [
			{
				label: 'Percent (0.0-1.0)',
				value: 'percentunit',
				factor: 100,
			},
			{
				label: 'Percent (0 - 100)',
				value: 'percent',
				factor: 1,
			},
		],
	},
	{
		label: 'Boolean',
		options: [
			{
				label: 'True / False',
				value: 'bool',
				factor: 1,
			},
			{
				label: 'Yes / No',
				value: 'bool_yes_no',
				factor: 1,
			},
		],
	},
];

function findUnitObject(
	unitValue: string,
): { label: string; value: string; factor: number } | null {
	const unitObj = unitsMapping
		.map((category) => category.options.find((unit) => unit.value === unitValue))
		.find(Boolean);

	return unitObj || null;
}

export function getFormattedUnit(unit: string): string {
	const isUniversalYAxisUnit = isUniversalUnit(unit);
	if (isUniversalYAxisUnit) {
		return UniversalUnitToGrafanaUnit[unit as UniversalYAxisUnit] || unit;
	}
	return unit;
}

export function convertValue(
	value: number,
	currentUnit?: string,
	targetUnit?: string,
): number | null {
	if (
		targetUnit === 'none' ||
		!currentUnit ||
		!targetUnit ||
		currentUnit === targetUnit
	) {
		return value;
	}

	const formattedCurrentUnit = getFormattedUnit(currentUnit);
	const formattedTargetUnit = getFormattedUnit(targetUnit);

	const currentUnitObj = findUnitObject(formattedCurrentUnit);
	const targetUnitObj = findUnitObject(formattedTargetUnit);

	if (currentUnitObj && targetUnitObj) {
		const baseValue = value * currentUnitObj.factor;

		return baseValue / targetUnitObj.factor;
	}
	return null;
}

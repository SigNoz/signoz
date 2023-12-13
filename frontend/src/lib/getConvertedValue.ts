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
				factor: 8, // 1 byte = 8 bits
			},
			{
				label: 'bits(SI)',
				value: 'decbits',
				factor: 8, // 1 byte = 8 bits
			},
			{
				label: 'kibibytes',
				value: 'kbytes',
				factor: 1024,
			},
			{
				label: 'kilobytes',
				value: 'deckbytes',
				factor: 1000,
			},
			{
				label: 'mebibytes',
				value: 'mbytes',
				factor: 1024 * 1024,
			},
			{
				label: 'megabytes',
				value: 'decmbytes',
				factor: 1000 * 1000,
			},
			{
				label: 'gibibytes',
				value: 'gbytes',
				factor: 1024 * 1024 * 1024,
			},
			{
				label: 'gigabytes',
				value: 'decgbytes',
				factor: 1000 * 1000 * 1000,
			},
			{
				label: 'tebibytes',
				value: 'tbytes',
				factor: 1024 * 1024 * 1024 * 1024,
			},
			{
				label: 'terabytes',
				value: 'dectbytes',
				factor: 1000 * 1000 * 1000 * 1000,
			},
			{
				label: 'pebibytes',
				value: 'pbytes',
				factor: 1024 * 1024 * 1024 * 1024 * 1024,
			},
			{
				label: 'petabytes',
				value: 'decpbytes',
				factor: 1000 * 1000 * 1000 * 1000 * 1000,
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
				factor: 8, // 1 byte = 8 bits
			},
			{
				label: 'bits/sec(SI)',
				value: 'bps',
				factor: 8, // 1 byte = 8 bits
			},
			{
				label: 'kibibytes/sec',
				value: 'KiBs',
				factor: 1024,
			},
			{
				label: 'kibibits/sec',
				value: 'Kibits',
				factor: 8 * 1024, // 1 KiB = 8 Kibits
			},
			{
				label: 'kilobytes/sec',
				value: 'KBs',
				factor: 1000,
			},
			{
				label: 'kilobits/sec',
				value: 'Kbits',
				factor: 8 * 1000, // 1 KB = 8 Kbits
			},
			{
				label: 'mebibytes/sec',
				value: 'MiBs',
				factor: 1024 * 1024,
			},
			{
				label: 'mebibits/sec',
				value: 'Mibits',
				factor: 8 * 1024 * 1024, // 1 MiB = 8 Mibits
			},
			// ... (other options)
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
	const currentUnitObj = findUnitObject(currentUnit);
	const targetUnitObj = findUnitObject(targetUnit);

	if (currentUnitObj && targetUnitObj) {
		const baseValue = value * currentUnitObj.factor;

		return baseValue / targetUnitObj.factor;
	}
	return null;
}

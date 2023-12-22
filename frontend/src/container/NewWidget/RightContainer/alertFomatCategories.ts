import { DefaultOptionType } from 'antd/es/select';

import {
	BooleanFormats,
	Category,
	CategoryNames,
	DataFormats,
	DataRateFormats,
	HelperCategory,
	HelperFormat,
	MiscellaneousFormats,
	ThroughputFormats,
	TimeFormats,
} from './types';

export const alertsCategory = [
	{
		name: CategoryNames.Time,
		formats: [
			{ name: 'nanoseconds (ns)', id: TimeFormats.Nanoseconds },
			{ name: 'microseconds (µs)', id: TimeFormats.Microseconds },
			{ name: 'milliseconds (ms)', id: TimeFormats.Milliseconds },
			{ name: 'seconds (s)', id: TimeFormats.Seconds },
			{ name: 'minutes (m)', id: TimeFormats.Minutes },
			{ name: 'hours (h)', id: TimeFormats.Hours },
			{ name: 'days (d)', id: TimeFormats.Days },
		],
	},
	{
		name: CategoryNames.Data,
		formats: [
			{ name: 'bytes(IEC)', id: DataFormats.BytesIEC },
			{ name: 'bytes(SI)', id: DataFormats.BytesSI },
			{ name: 'bits(IEC)', id: DataFormats.BitsIEC },
			{ name: 'bits(SI)', id: DataFormats.BitsSI },
			{ name: 'kibibytes', id: DataFormats.KibiBytes },
			{ name: 'kilobytes', id: DataFormats.KiloBytes },
			{ name: 'mebibytes', id: DataFormats.MebiBytes },
			{ name: 'megabytes', id: DataFormats.MegaBytes },
			{ name: 'gibibytes', id: DataFormats.GibiBytes },
			{ name: 'gigabytes', id: DataFormats.GigaBytes },
			{ name: 'tebibytes', id: DataFormats.TebiBytes },
			{ name: 'terabytes', id: DataFormats.TeraBytes },
			{ name: 'pebibytes', id: DataFormats.PebiBytes },
			{ name: 'petabytes', id: DataFormats.PetaBytes },
		],
	},
	{
		name: CategoryNames.DataRate,
		formats: [
			{ name: 'bytes/sec(IEC)', id: DataRateFormats.BytesPerSecIEC },
			{ name: 'bytes/sec(SI)', id: DataRateFormats.BytesPerSecSI },
			{ name: 'bits/sec(IEC)', id: DataRateFormats.BitsPerSecIEC },
			{ name: 'bits/sec(SI)', id: DataRateFormats.BitsPerSecSI },
			{ name: 'kibibytes/sec', id: DataRateFormats.KibiBytesPerSec },
			{ name: 'kibibits/sec', id: DataRateFormats.KibiBitsPerSec },
			{ name: 'kilobytes/sec', id: DataRateFormats.KiloBytesPerSec },
			{ name: 'kilobits/sec', id: DataRateFormats.KiloBitsPerSec },
			{ name: 'mebibytes/sec', id: DataRateFormats.MebiBytesPerSec },
			{ name: 'mebibits/sec', id: DataRateFormats.MebiBitsPerSec },
			{ name: 'megabytes/sec', id: DataRateFormats.MegaBytesPerSec },
			{ name: 'megabits/sec', id: DataRateFormats.MegaBitsPerSec },
			{ name: 'gibibytes/sec', id: DataRateFormats.GibiBytesPerSec },
			{ name: 'gibibits/sec', id: DataRateFormats.GibiBitsPerSec },
			{ name: 'gigabytes/sec', id: DataRateFormats.GigaBytesPerSec },
			{ name: 'gigabits/sec', id: DataRateFormats.GigaBitsPerSec },
			{ name: 'tebibytes/sec', id: DataRateFormats.TebiBytesPerSec },
			{ name: 'tebibits/sec', id: DataRateFormats.TebiBitsPerSec },
			{ name: 'terabytes/sec', id: DataRateFormats.TeraBytesPerSec },
			{ name: 'terabits/sec', id: DataRateFormats.TeraBitsPerSec },
			{ name: 'pebibytes/sec', id: DataRateFormats.PebiBytesPerSec },
			{ name: 'pebibits/sec', id: DataRateFormats.PebiBitsPerSec },
			{ name: 'petabytes/sec', id: DataRateFormats.PetaBytesPerSec },
			{ name: 'petabits/sec', id: DataRateFormats.PetaBitsPerSec },
		],
	},
	{
		name: CategoryNames.Miscellaneous,
		formats: [
			{ name: 'Percent (0.0-1.0)', id: MiscellaneousFormats.PercentUnit },
			{ name: 'Percent (0 - 100)', id: MiscellaneousFormats.Percent },
		],
	},
	{
		name: CategoryNames.Boolean,
		formats: [
			{ name: 'True / False', id: BooleanFormats.TRUE_FALSE },
			{ name: 'Yes / No', id: BooleanFormats.YES_NO },
		],
	},
	{
		name: CategoryNames.Throughput,
		formats: [
			{ name: 'counts/sec (cps)', id: ThroughputFormats.CountsPerSec },
			{ name: 'ops/sec (ops)', id: ThroughputFormats.OpsPerSec },
			{ name: 'requests/sec (reqps)', id: ThroughputFormats.RequestsPerSec },
			{ name: 'reads/sec (rps)', id: ThroughputFormats.ReadsPerSec },
			{ name: 'writes/sec (wps)', id: ThroughputFormats.WritesPerSec },
			{ name: 'I/O operations/sec (iops)', id: ThroughputFormats.IOOpsPerSec },
			{ name: 'counts/min (cpm)', id: ThroughputFormats.CountsPerMin },
			{ name: 'ops/min (opm)', id: ThroughputFormats.OpsPerMin },
			{ name: 'reads/min (rpm)', id: ThroughputFormats.ReadsPerMin },
			{ name: 'writes/min (wpm)', id: ThroughputFormats.WritesPerMin },
		],
	},
];

export const getCategorySelectOptionByName = (
	name?: CategoryNames | string,
): DefaultOptionType[] =>
	alertsCategory
		.find((category) => category.name === name)
		?.formats.map((format) => ({
			label: format.name,
			value: format.id,
		})) || [];

export const getCategoryByOptionId = (id: string): Category | undefined =>
	alertsCategory.find((category) =>
		category.formats.some((format) => format.id === id),
	);

export const isCategoryName = (name: string): name is CategoryNames =>
	alertsCategory.some((category) => category.name === name);

const allFormats: HelperFormat[] = alertsCategory.flatMap(
	(category: HelperCategory) => category.formats,
);

export const getFormatNameByOptionId = (id: string): string | undefined =>
	allFormats.find((format) => format.id === id)?.name;

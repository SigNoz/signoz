import {
	DataFormats,
	DataRateFormats,
	MiscellaneousFormats,
	ThroughputFormats,
	TimeFormats,
} from 'container/NewWidget/RightContainer/types';

export const dataFormatConfig: { [key in DataFormats]: number } = {
	[DataFormats.BytesIEC]: 1,
	[DataFormats.BytesSI]: 1,
	[DataFormats.BitsIEC]: 1 / 8,
	[DataFormats.BitsSI]: 1 / 8,
	[DataFormats.KibiBytes]: 1024,
	[DataFormats.KiloBytes]: 1000,
	[DataFormats.MebiBytes]: 1024 ** 2,
	[DataFormats.MegaBytes]: 1000 ** 2,
	[DataFormats.GibiBytes]: 1024 ** 3,
	[DataFormats.GigaBytes]: 1000 ** 3,
	[DataFormats.TebiBytes]: 1024 ** 4,
	[DataFormats.TeraBytes]: 1000 ** 4,
	[DataFormats.PebiBytes]: 1024 ** 5,
	[DataFormats.PetaBytes]: 1000 ** 5,
};

export const throughputConfig: {
	[key in ThroughputFormats]: number;
} = {
	[ThroughputFormats.CountsPerSec]: 1,
	[ThroughputFormats.OpsPerSec]: 1,
	[ThroughputFormats.RequestsPerSec]: 1,
	[ThroughputFormats.ReadsPerSec]: 1,
	[ThroughputFormats.WritesPerSec]: 1,
	[ThroughputFormats.IOOpsPerSec]: 1,
	[ThroughputFormats.CountsPerMin]: 1 / 60,
	[ThroughputFormats.OpsPerMin]: 1 / 60,
	[ThroughputFormats.ReadsPerMin]: 1 / 60,
	[ThroughputFormats.WritesPerMin]: 1 / 60,
};

export const timeUnitsConfig: { [key in TimeFormats]: number } = {
	[TimeFormats.Hertz]: 1, // For simplicity; Hertz is typically 1/second
	[TimeFormats.Nanoseconds]: 1e-9, // 1 second = 1 billion nanoseconds
	[TimeFormats.Microseconds]: 1e-6, // 1 second = 1 million microseconds
	[TimeFormats.Milliseconds]: 1e-3, // 1 second = 1000 milliseconds
	[TimeFormats.Seconds]: 1, // Base unit for time
	[TimeFormats.Minutes]: 60, // 1 minute = 60 seconds
	[TimeFormats.Hours]: 3600, // 1 hour = 3600 seconds
	[TimeFormats.Days]: 86400, // 1 day = 86400 seconds
	// The following formats might require more specific handling since they could have various representations:
	[TimeFormats.DurationMs]: 1e-3, // Assuming this represents a duration in milliseconds
	[TimeFormats.DurationS]: 1, // Assuming this represents a duration in seconds
	[TimeFormats.DurationHms]: 3600, // Assuming this represents a duration in hours-min-sec format (taking hour as base)
	[TimeFormats.DurationDhms]: 86400, // Assuming this represents a duration in days-hour-min-sec format (taking day as base)
	[TimeFormats.Timeticks]: 1e-3, // Assuming 1 timetick = 1 ms, may need adjustment based on actual meaning
	[TimeFormats.ClockMs]: 1e-3, // Assuming clock time in milliseconds
	[TimeFormats.ClockS]: 1, // Assuming clock time in seconds
};

export const dataRateUnitsConfig: { [key in DataRateFormats]: number } = {
	[DataRateFormats.PacketsPerSec]: 1, // Keeping it 1 for simplicity as PacketsPerSec does not specify data size.
	[DataRateFormats.BytesPerSecIEC]: dataFormatConfig[DataFormats.BytesIEC],
	[DataRateFormats.BytesPerSecSI]: dataFormatConfig[DataFormats.BytesSI],
	[DataRateFormats.BitsPerSecIEC]: dataFormatConfig[DataFormats.BitsIEC],
	[DataRateFormats.BitsPerSecSI]: dataFormatConfig[DataFormats.BitsSI],
	[DataRateFormats.KibiBytesPerSec]: dataFormatConfig[DataFormats.KibiBytes],
	[DataRateFormats.KibiBitsPerSec]: dataFormatConfig[DataFormats.KibiBytes] * 8,
	[DataRateFormats.KiloBytesPerSec]: dataFormatConfig[DataFormats.KiloBytes],
	[DataRateFormats.KiloBitsPerSec]: dataFormatConfig[DataFormats.KiloBytes] * 8,
	[DataRateFormats.MebiBytesPerSec]: dataFormatConfig[DataFormats.MebiBytes],
	[DataRateFormats.MebiBitsPerSec]: dataFormatConfig[DataFormats.MebiBytes] * 8,
	[DataRateFormats.MegaBytesPerSec]: dataFormatConfig[DataFormats.MegaBytes],
	[DataRateFormats.MegaBitsPerSec]: dataFormatConfig[DataFormats.MegaBytes] * 8,
	[DataRateFormats.GibiBytesPerSec]: dataFormatConfig[DataFormats.GibiBytes],
	[DataRateFormats.GibiBitsPerSec]: dataFormatConfig[DataFormats.GibiBytes] * 8,
	[DataRateFormats.GigaBytesPerSec]: dataFormatConfig[DataFormats.GigaBytes],
	[DataRateFormats.GigaBitsPerSec]: dataFormatConfig[DataFormats.GigaBytes] * 8,
	[DataRateFormats.TebiBytesPerSec]: dataFormatConfig[DataFormats.TebiBytes],
	[DataRateFormats.TebiBitsPerSec]: dataFormatConfig[DataFormats.TebiBytes] * 8,
	[DataRateFormats.TeraBytesPerSec]: dataFormatConfig[DataFormats.TeraBytes],
	[DataRateFormats.TeraBitsPerSec]: dataFormatConfig[DataFormats.TeraBytes] * 8,
	[DataRateFormats.PebiBytesPerSec]: dataFormatConfig[DataFormats.PebiBytes],
	[DataRateFormats.PebiBitsPerSec]: dataFormatConfig[DataFormats.PebiBytes] * 8,
	[DataRateFormats.PetaBytesPerSec]: dataFormatConfig[DataFormats.PetaBytes],
	[DataRateFormats.PetaBitsPerSec]: dataFormatConfig[DataFormats.PetaBytes] * 8,
};

export const miscUnitsConfig: {
	[key in MiscellaneousFormats]: number | null;
} = {
	[MiscellaneousFormats.None]: 1,
	[MiscellaneousFormats.String]: null, // Cannot be directly converted
	[MiscellaneousFormats.Short]: 1, // Assuming it's a representation and doesn't affect value
	[MiscellaneousFormats.Percent]: 0.01, // 1 percent = 0.01 in fraction form
	[MiscellaneousFormats.PercentUnit]: 1, // Assuming it's just a representation, like "50%"
	[MiscellaneousFormats.Humidity]: 1, // Assuming it's a percentage representation
	[MiscellaneousFormats.Decibel]: null, // Decibel conversion is logarithmic and might need a different formula
	[MiscellaneousFormats.Hexadecimal0x]: null, // Hexadecimal requires specific conversion
	[MiscellaneousFormats.Hexadecimal]: null, // Hexadecimal requires specific conversion
	[MiscellaneousFormats.ScientificNotation]: null, // Requires specific conversion
	[MiscellaneousFormats.LocaleFormat]: null, // Depends on locale settings
	[MiscellaneousFormats.Pixels]: 1, // Assuming pixel count representation
};

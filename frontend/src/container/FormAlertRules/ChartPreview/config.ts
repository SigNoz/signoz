import {
	DataFormats,
	ThroughputFormats,
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

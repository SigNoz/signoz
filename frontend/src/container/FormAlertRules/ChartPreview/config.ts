import { DataFormats } from 'container/NewWidget/RightContainer/types';

export const unitsConfig: { [key in DataFormats]: number } = {
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

import { DataFormats } from 'container/NewWidget/RightContainer/types';

import { unitsConfig } from './config';

export function convertData(
	value: number,
	sourceUnit: DataFormats | string = DataFormats.BitsIEC,
	targetUnit: DataFormats | string = DataFormats.BitsIEC,
): number {
	const bytes = value * unitsConfig[sourceUnit as DataFormats];
	return bytes / unitsConfig[targetUnit as DataFormats];
}

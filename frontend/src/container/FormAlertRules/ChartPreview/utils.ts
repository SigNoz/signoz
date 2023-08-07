import { DataFormats } from 'container/NewWidget/RightContainer/types';

import { unitsConfig } from './config';

export function covertIntoDataFormats({
	value,
	sourceUnit = DataFormats.BitsIEC,
	targetUnit = DataFormats.BitsIEC,
}: IUnit): number {
	const bytes = value * unitsConfig[sourceUnit as DataFormats];
	return bytes / unitsConfig[targetUnit as DataFormats];
}

interface IUnit {
	value: number;
	sourceUnit?: DataFormats | string;
	targetUnit?: DataFormats | string;
}

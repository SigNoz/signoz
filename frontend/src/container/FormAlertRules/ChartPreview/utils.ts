import { dataFormatConfig, throughputConfig } from './config';

const allConfig = {
	...dataFormatConfig,
	...throughputConfig,
};

export function covertIntoDataFormats({
	value,
	sourceUnit,
	targetUnit,
}: IUnit): number {
	if (!sourceUnit || !targetUnit) {
		return 0;
	}

	const sourceValue = value * allConfig[sourceUnit];

	return sourceValue / allConfig[targetUnit];
}

interface IUnit {
	value: number;
	sourceUnit?: string;
	targetUnit?: string;
}

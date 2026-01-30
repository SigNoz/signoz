import { Range } from 'uplot';

export type LogScaleLimits = {
	min: number | null | undefined;
	max: number | null | undefined;
	softMin: number | null | undefined;
	softMax: number | null | undefined;
};

export type RangeFunctionParams = {
	rangeConfig: Range.Config;
	hardMinOnly: boolean;
	hardMaxOnly: boolean;
	hasFixedRange: boolean;
	min: number | null | undefined;
	max: number | null | undefined;
};

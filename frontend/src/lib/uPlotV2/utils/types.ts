import { Range } from 'uplot';

export type LogScaleLimits = {
	min: number | null;
	max: number | null;
	softMin: number | null;
	softMax: number | null;
};

export type RangeFunctionParams = {
	rangeConfig: Range.Config;
	hardMinOnly: boolean;
	hardMaxOnly: boolean;
	hasFixedRange: boolean;
	min: number | null;
	max: number | null;
};

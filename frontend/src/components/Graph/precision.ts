export const DEFAULT_SIGNIFICANT_DIGITS = 15;

export const MAX_DECIMALS = 15;

export enum PrecisionOptionsEnum {
	ZERO = 0,
	ONE = 1,
	TWO = 2,
	THREE = 3,
	FOUR = 4,
	FULL = 'full',
}
export type PrecisionOption = 0 | 1 | 2 | 3 | 4 | PrecisionOptionsEnum.FULL;

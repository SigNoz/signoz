import {
	DEFAULT_SIGNIFICANT_DIGITS,
	MAX_DECIMALS,
	PrecisionOption,
	PrecisionOptionsEnum,
} from './types';

export const formatDecimalWithLeadingZeros = (
	value: number,
	precision: PrecisionOption,
): string => {
	if (value === 0) {
		return '0';
	}

	const numStr = value.toLocaleString('en-US', {
		useGrouping: false,
		maximumFractionDigits: 20,
	});

	const [integerPart, decimalPart = ''] = numStr.split('.');

	if (!decimalPart) {
		return integerPart;
	}

	const firstNonZeroIndex = decimalPart.search(/[^0]/);

	if (firstNonZeroIndex === -1) {
		return integerPart;
	}

	const significantDigits =
		precision === PrecisionOptionsEnum.FULL
			? DEFAULT_SIGNIFICANT_DIGITS
			: precision;
	const decimalsToKeep = firstNonZeroIndex + (significantDigits || 0);

	const finalDecimalsToKeep = Math.min(decimalsToKeep, MAX_DECIMALS);
	const trimmedDecimalPart = decimalPart.substring(0, finalDecimalsToKeep);

	if (precision === 0) {
		return integerPart;
	}

	const finalDecimalPart = trimmedDecimalPart.replace(/0+$/, '');

	return finalDecimalPart ? `${integerPart}.${finalDecimalPart}` : integerPart;
};

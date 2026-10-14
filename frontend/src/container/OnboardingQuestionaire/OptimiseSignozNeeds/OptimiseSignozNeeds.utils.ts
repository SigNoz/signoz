export const SLIDER_MIN_POSITION = 0;
export const SLIDER_MAX_POSITION = 100;

const FIRST_EXPONENTIAL_POSITION = 1;
const EXPONENTIAL_POSITION_RANGE =
	SLIDER_MAX_POSITION - FIRST_EXPONENTIAL_POSITION;

export function linearToExponential(
	value: number,
	min: number,
	max: number,
): number {
	if (!Number.isFinite(value) || value <= SLIDER_MIN_POSITION) {
		return 0;
	}

	const sliderPosition = Math.min(
		SLIDER_MAX_POSITION,
		Math.max(FIRST_EXPONENTIAL_POSITION, value),
	);
	const expMin = Math.log10(min);
	const expMax = Math.log10(max);
	const exponent =
		expMin +
		((expMax - expMin) * (sliderPosition - FIRST_EXPONENTIAL_POSITION)) /
			EXPONENTIAL_POSITION_RANGE;

	return Math.round(10 ** exponent);
}

export function exponentialToLinear(
	expValue: number,
	min: number,
	max: number,
): number {
	if (!Number.isFinite(expValue) || expValue <= 0) {
		return SLIDER_MIN_POSITION;
	}

	const boundedValue = Math.min(max, Math.max(min, expValue));
	const expMin = Math.log10(min);
	const expMax = Math.log10(max);
	const sliderPosition =
		FIRST_EXPONENTIAL_POSITION +
		((Math.log10(boundedValue) - expMin) / (expMax - expMin)) *
			EXPONENTIAL_POSITION_RANGE;

	return Math.round(sliderPosition);
}

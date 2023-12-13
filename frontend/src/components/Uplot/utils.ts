import uPlot from 'uplot';

type OptionsUpdateState = 'keep' | 'update' | 'create';

export const optionsUpdateState = (
	_lhs: uPlot.Options,
	_rhs: uPlot.Options,
): OptionsUpdateState => {
	const { width: lhsWidth, height: lhsHeight, ...lhs } = _lhs;
	const { width: rhsWidth, height: rhsHeight, ...rhs } = _rhs;

	let state: OptionsUpdateState = 'keep';

	if (lhsHeight !== rhsHeight || lhsWidth !== rhsWidth) {
		state = 'update';
	}
	if (Object.keys(lhs)?.length !== Object.keys(rhs)?.length) {
		return 'create';
	}
	// eslint-disable-next-line no-restricted-syntax
	for (const k of Object.keys(lhs)) {
		if (!Object.is((lhs as any)[k], (rhs as any)[k])) {
			state = 'create';
			break;
		}
	}
	return state;
};

export const dataMatch = (
	lhs: uPlot.AlignedData,
	rhs: uPlot.AlignedData,
): boolean => {
	if (lhs?.length !== rhs?.length) {
		return false;
	}
	return lhs.every((lhsOneSeries, seriesIdx) => {
		const rhsOneSeries = rhs[seriesIdx];
		if (lhsOneSeries?.length !== rhsOneSeries?.length) {
			return false;
		}

		// compare each value in the series
		return (lhsOneSeries as number[])?.every(
			(value, valueIdx) => value === rhsOneSeries[valueIdx],
		);
	});
};

import { CumulativeWindowTimeframes, RollingWindowTimeframes } from './types';

export const getEvaluationWindowTypeText = (
	windowType: 'rolling' | 'cumulative',
): string => {
	switch (windowType) {
		case 'rolling':
			return 'Rolling';
		case 'cumulative':
			return 'Cumulative';
		default:
			return 'Rolling';
	}
};

export const getCumulativeWindowTimeframeText = (timeframe: string): string => {
	switch (timeframe) {
		case CumulativeWindowTimeframes.CURRENT_HOUR:
			return 'Current hour';
		case CumulativeWindowTimeframes.CURRENT_DAY:
			return 'Current day';
		case CumulativeWindowTimeframes.CURRENT_MONTH:
			return 'Current month';
		default:
			return 'Current hour';
	}
};

export const getRollingWindowTimeframeText = (
	timeframe: RollingWindowTimeframes,
): string => {
	switch (timeframe) {
		case RollingWindowTimeframes.LAST_5_MINUTES:
			return 'Last 5 minutes';
		case RollingWindowTimeframes.LAST_10_MINUTES:
			return 'Last 10 minutes';
		case RollingWindowTimeframes.LAST_15_MINUTES:
			return 'Last 15 minutes';
		case RollingWindowTimeframes.LAST_30_MINUTES:
			return 'Last 30 minutes';
		case RollingWindowTimeframes.LAST_1_HOUR:
			return 'Last 1 hour';
		case RollingWindowTimeframes.LAST_2_HOURS:
			return 'Last 2 hours';
		case RollingWindowTimeframes.LAST_4_HOURS:
			return 'Last 4 hours';
		default:
			return 'Last 5 minutes';
	}
};

export const getTimeframeText = (
	windowType: 'rolling' | 'cumulative',
	timeframe: string,
): string => {
	if (windowType === 'rolling') {
		return getRollingWindowTimeframeText(timeframe as RollingWindowTimeframes);
	}
	return getCumulativeWindowTimeframeText(timeframe);
};

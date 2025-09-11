import { Color } from '@signozhq/design-tokens';
import { TIMEZONE_DATA } from 'container/CreateAlertV2/EvaluationSettings/utils';
import dayjs from 'dayjs';
import getRandomColor from 'lib/getRandomColor';
import { v4 } from 'uuid';

import {
	AdvancedOptionsState,
	AlertState,
	AlertThresholdMatchType,
	AlertThresholdOperator,
	AlertThresholdState,
	Algorithm,
	EvaluationWindowState,
	Seasonality,
	Threshold,
	TimeDuration,
} from './types';

export const INITIAL_ALERT_STATE: AlertState = {
	name: '',
	description: '',
	labels: {},
	yAxisUnit: undefined,
};

export const INITIAL_CRITICAL_THRESHOLD: Threshold = {
	id: v4(),
	label: 'CRITICAL',
	thresholdValue: 0,
	recoveryThresholdValue: 0,
	unit: '',
	channels: [],
	color: Color.BG_SAKURA_500,
};

export const INITIAL_WARNING_THRESHOLD: Threshold = {
	id: v4(),
	label: 'WARNING',
	thresholdValue: 0,
	recoveryThresholdValue: 0,
	unit: '',
	channels: [],
	color: Color.BG_AMBER_500,
};

export const INITIAL_INFO_THRESHOLD: Threshold = {
	id: v4(),
	label: 'INFO',
	thresholdValue: 0,
	recoveryThresholdValue: 0,
	unit: '',
	channels: [],
	color: Color.BG_ROBIN_500,
};

export const INITIAL_RANDOM_THRESHOLD: Threshold = {
	id: v4(),
	label: '',
	thresholdValue: 0,
	recoveryThresholdValue: 0,
	unit: '',
	channels: [],
	color: getRandomColor(),
};

export const INITIAL_ALERT_THRESHOLD_STATE: AlertThresholdState = {
	selectedQuery: 'A',
	operator: AlertThresholdOperator.IS_ABOVE,
	matchType: AlertThresholdMatchType.AT_LEAST_ONCE,
	evaluationWindow: TimeDuration.FIVE_MINUTES,
	algorithm: Algorithm.STANDARD,
	seasonality: Seasonality.HOURLY,
	thresholds: [INITIAL_CRITICAL_THRESHOLD],
};

export const INITIAL_ADVANCED_OPTIONS_STATE: AdvancedOptionsState = {
	sendNotificationIfDataIsMissing: {
		toleranceLimit: 0,
		timeUnit: '',
	},
	enforceMinimumDatapoints: {
		minimumDatapoints: 0,
	},
	delayEvaluation: {
		delay: 0,
		timeUnit: '',
	},
	evaluationCadence: {
		mode: 'default',
		default: {
			value: 1,
			timeUnit: 'm',
		},
		custom: {
			repeatEvery: 'week',
			startAt: '00:00:00',
			occurence: [],
			timezone: TIMEZONE_DATA[0].value,
		},
		rrule: {
			date: dayjs(),
			startAt: '00:00:00',
			rrule: '',
		},
	},
};

export const INITIAL_EVALUATION_WINDOW_STATE: EvaluationWindowState = {
	windowType: 'rolling',
	timeframe: '5m0s',
	startingAt: {
		time: '00:00:00',
		number: '1',
		timezone: TIMEZONE_DATA[0].value,
	},
};

export const THRESHOLD_OPERATOR_OPTIONS = [
	{ value: AlertThresholdOperator.IS_ABOVE, label: 'IS ABOVE' },
	{ value: AlertThresholdOperator.IS_BELOW, label: 'IS BELOW' },
	{ value: AlertThresholdOperator.IS_EQUAL_TO, label: 'IS EQUAL TO' },
	{ value: AlertThresholdOperator.IS_NOT_EQUAL_TO, label: 'IS NOT EQUAL TO' },
];

export const ANOMALY_THRESHOLD_OPERATOR_OPTIONS = [
	{ value: AlertThresholdOperator.IS_ABOVE, label: 'IS ABOVE' },
	{ value: AlertThresholdOperator.IS_BELOW, label: 'IS BELOW' },
	{ value: AlertThresholdOperator.ABOVE_BELOW, label: 'ABOVE/BELOW' },
];

export const THRESHOLD_MATCH_TYPE_OPTIONS = [
	{ value: AlertThresholdMatchType.AT_LEAST_ONCE, label: 'AT LEAST ONCE' },
	{ value: AlertThresholdMatchType.ALL_THE_TIME, label: 'ALL THE TIME' },
	{ value: AlertThresholdMatchType.ON_AVERAGE, label: 'ON AVERAGE' },
	{ value: AlertThresholdMatchType.IN_TOTAL, label: 'IN TOTAL' },
	{ value: AlertThresholdMatchType.LAST, label: 'LAST' },
];

export const ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS = [
	{ value: AlertThresholdMatchType.AT_LEAST_ONCE, label: 'AT LEAST ONCE' },
	{ value: AlertThresholdMatchType.ALL_THE_TIME, label: 'ALL THE TIME' },
];

export const ANOMALY_TIME_DURATION_OPTIONS = [
	{ value: TimeDuration.FIVE_MINUTES, label: '5 minutes' },
	{ value: TimeDuration.TEN_MINUTES, label: '10 minutes' },
	{ value: TimeDuration.FIFTEEN_MINUTES, label: '15 minutes' },
	{ value: TimeDuration.ONE_HOUR, label: '1 hour' },
	{ value: TimeDuration.THREE_HOURS, label: '3 hours' },
	{ value: TimeDuration.FOUR_HOURS, label: '4 hours' },
	{ value: TimeDuration.TWENTY_FOUR_HOURS, label: '24 hours' },
];

export const ANOMALY_ALGORITHM_OPTIONS = [
	{ value: Algorithm.STANDARD, label: 'Standard' },
];

export const ANOMALY_SEASONALITY_OPTIONS = [
	{ value: Seasonality.HOURLY, label: 'Hourly' },
	{ value: Seasonality.DAILY, label: 'Daily' },
	{ value: Seasonality.WEEKLY, label: 'Weekly' },
];

export const ADVANCED_OPTIONS_TIME_UNIT_OPTIONS = [
	{ value: 's', label: 'Second' },
	{ value: 'm', label: 'Minute' },
	{ value: 'h', label: 'Hours' },
	{ value: 'd', label: 'Day' },
];

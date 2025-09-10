import { Color } from '@signozhq/design-tokens';
import getRandomColor from 'lib/getRandomColor';
import { v4 } from 'uuid';

import {
	AlertState,
	AlertThresholdMatchType,
	AlertThresholdOperator,
	AlertThresholdState,
	Threshold,
} from './types';

export const INITIAL_ALERT_STATE: AlertState = {
	name: '',
	description: '',
	labels: {},
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
	evaluationWindow: '5m0s',
	algorithm: 'standard',
	seasonality: 'hourly',
	thresholds: [INITIAL_CRITICAL_THRESHOLD],
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

export const ANAMOLY_TIME_DURATION_OPTIONS = [
	{ value: '5m0s', label: '5 minutes' },
	{ value: '10m0s', label: '10 minutes' },
	{ value: '15m0s', label: '15 minutes' },
	{ value: '1h0m0s', label: '1 hour' },
	{ value: '3h0m0s', label: '3 hours' },
	{ value: '4h0m0s', label: '4 hours' },
	{ value: '24h0m0s', label: '24 hours' },
];

export const ANOMALY_ALGORITHM_OPTIONS = [
	{ value: 'standard', label: 'Standard' },
];

export const ANOMALY_SEASONALITY_OPTIONS = [
	{ value: 'hourly', label: 'Hourly' },
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
];

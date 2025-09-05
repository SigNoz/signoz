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
	evaluationWindow: '1m0s',
	algorithm: 'standard',
	seasonality: 'hourly',
	thresholds: [INITIAL_CRITICAL_THRESHOLD],
};

export const THRESHOLD_OPERATOR_OPTIONS = [
	{ value: '1', label: 'IS ABOVE' },
	{ value: '2', label: 'IS BELOW' },
	{ value: '3', label: 'IS EQUAL TO' },
	{ value: '4', label: 'IS NOT EQUAL TO' },
];

export const ANOMALY_THRESHOLD_OPERATOR_OPTIONS = [
	{ value: '1', label: 'IS ABOVE' },
	{ value: '2', label: 'IS BELOW' },
];

export const THRESHOLD_MATCH_TYPE_OPTIONS = [
	{ value: '1', label: 'AT LEAST ONCE' },
	{ value: '2', label: 'ALL THE TIME' },
	{ value: '3', label: 'ON AVERAGE' },
	{ value: '4', label: 'IN TOTAL' },
	{ value: '5', label: 'LAST' },
];

export const ANOMALY_THRESHOLD_MATCH_TYPE_OPTIONS = [
	{ value: '1', label: 'AT LEAST ONCE' },
	{ value: '2', label: 'ALL THE TIME' },
];

export const ANAMOLY_TIME_DURATION_OPTIONS = [
	{ value: '1m0s', label: '1 minute' },
	{ value: '5m0s', label: '5 minutes' },
	{ value: '10m0s', label: '10 minutes' },
	{ value: '15m0s', label: '15 minutes' },
	{ value: '30m0s', label: '30 minutes' },
	{ value: '1h0m0s', label: '1 hour' },
	{ value: '3h0m0s', label: '3 hours' },
	{ value: '6h0m0s', label: '6 hours' },
	{ value: '12h0m0s', label: '12 hours' },
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

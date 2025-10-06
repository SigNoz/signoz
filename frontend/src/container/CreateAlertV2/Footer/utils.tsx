import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import {
	BasicThreshold,
	PostableAlertRuleV2,
} from 'types/api/alerts/alertTypesV2';
import { EQueryType } from 'types/common/dashboard';
import { compositeQueryToQueryEnvelope } from 'utils/compositeQueryToQueryEnvelope';

import {
	AdvancedOptionsState,
	EvaluationWindowState,
	NotificationSettingsState,
} from '../context/types';
import { BuildCreateAlertRulePayloadArgs } from './types';

// Get formatted time/unit pairs for create alert api payload
export function getFormattedTimeValue(timeValue: number, unit: string): string {
	const unitMap: Record<string, string> = {
		[UniversalYAxisUnit.SECONDS]: 's',
		[UniversalYAxisUnit.MINUTES]: 'm',
		[UniversalYAxisUnit.HOURS]: 'h',
		[UniversalYAxisUnit.DAYS]: 'd',
	};
	return `${timeValue}${unitMap[unit]}`;
}

// Validate create alert api payload
export function validateCreateAlertState(
	args: BuildCreateAlertRulePayloadArgs,
): string | null {
	const { basicAlertState, thresholdState, notificationSettings } = args;

	// Validate alert name
	if (!basicAlertState.name) {
		return 'Please enter an alert name';
	}

	// Validate threshold state if routing policies is not enabled
	for (let i = 0; i < thresholdState.thresholds.length; i++) {
		const threshold = thresholdState.thresholds[i];
		if (!threshold.label) {
			return 'Please enter a label for each threshold';
		}
		if (!notificationSettings.routingPolicies && !threshold.channels.length) {
			return 'Please select at least one channel for each threshold or enable routing policies';
		}
	}

	return null;
}

// Get notification settings props for create alert api payload
export function getNotificationSettingsProps(
	notificationSettings: NotificationSettingsState,
): PostableAlertRuleV2['notificationSettings'] {
	const notificationSettingsProps: PostableAlertRuleV2['notificationSettings'] = {
		groupBy: notificationSettings.multipleNotifications || [],
		usePolicy: notificationSettings.routingPolicies,
		renotify: {
			enabled: notificationSettings.reNotification.enabled,
			interval: getFormattedTimeValue(
				notificationSettings.reNotification.value,
				notificationSettings.reNotification.unit,
			),
			alertStates: notificationSettings.reNotification.conditions,
		},
	};

	return notificationSettingsProps;
}

// Get alert on absent props for create alert api payload
export function getAlertOnAbsentProps(
	advancedOptions: AdvancedOptionsState,
): Partial<PostableAlertRuleV2['condition']> {
	if (advancedOptions.sendNotificationIfDataIsMissing.enabled) {
		return {
			alertOnAbsent: true,
			absentFor: advancedOptions.sendNotificationIfDataIsMissing.toleranceLimit,
		};
	}
	return {
		alertOnAbsent: false,
	};
}

// Get enforce minimum datapoints props for create alert api payload
export function getEnforceMinimumDatapointsProps(
	advancedOptions: AdvancedOptionsState,
): Partial<PostableAlertRuleV2['condition']> {
	if (advancedOptions.enforceMinimumDatapoints.enabled) {
		return {
			requireMinPoints: true,
			requiredNumPoints:
				advancedOptions.enforceMinimumDatapoints.minimumDatapoints,
		};
	}
	return {
		requireMinPoints: false,
	};
}

// Get evaluation props for create alert api payload
export function getEvaluationProps(
	evaluationWindow: EvaluationWindowState,
	advancedOptions: AdvancedOptionsState,
): PostableAlertRuleV2['evaluation'] {
	const frequency = getFormattedTimeValue(
		advancedOptions.evaluationCadence.default.value,
		advancedOptions.evaluationCadence.default.timeUnit,
	);

	if (
		evaluationWindow.windowType === 'rolling' &&
		evaluationWindow.timeframe !== 'custom'
	) {
		return {
			kind: evaluationWindow.windowType,
			spec: {
				evalWindow: evaluationWindow.timeframe,
				frequency,
			},
		};
	}

	if (
		evaluationWindow.windowType === 'rolling' &&
		evaluationWindow.timeframe === 'custom'
	) {
		return {
			kind: evaluationWindow.windowType,
			spec: {
				evalWindow: getFormattedTimeValue(
					Number(evaluationWindow.startingAt.number),
					evaluationWindow.startingAt.unit,
				),
				frequency,
			},
		};
	}

	// Only cumulative window type left now
	if (evaluationWindow.timeframe === 'currentHour') {
		return {
			kind: evaluationWindow.windowType,
			spec: {
				schedule: {
					type: 'hourly',
					minute: Number(evaluationWindow.startingAt.number),
				},
				frequency,
				timezone: evaluationWindow.startingAt.timezone,
			},
		};
	}

	if (evaluationWindow.timeframe === 'currentDay') {
		// time is in the format of "HH:MM:SS"
		const [hour, minute] = evaluationWindow.startingAt.time.split(':');
		return {
			kind: evaluationWindow.windowType,
			spec: {
				schedule: {
					type: 'daily',
					hour: Number(hour),
					minute: Number(minute),
				},
				frequency,
				timezone: evaluationWindow.startingAt.timezone,
			},
		};
	}

	if (evaluationWindow.timeframe === 'currentMonth') {
		// time is in the format of "HH:MM:SS"
		const [hour, minute] = evaluationWindow.startingAt.time.split(':');
		return {
			kind: evaluationWindow.windowType,
			spec: {
				schedule: {
					type: 'monthly',
					day: Number(evaluationWindow.startingAt.number),
					hour: Number(hour),
					minute: Number(minute),
				},
				frequency,
				timezone: evaluationWindow.startingAt.timezone,
			},
		};
	}

	return {
		kind: evaluationWindow.windowType,
		spec: {
			evalWindow: evaluationWindow.timeframe,
			frequency,
		},
	};
}

// Build Create Threshold Alert Rule Payload
export function buildCreateThresholdAlertRulePayload(
	args: BuildCreateAlertRulePayloadArgs,
): PostableAlertRuleV2 {
	const {
		alertType,
		basicAlertState,
		thresholdState,
		evaluationWindow,
		advancedOptions,
		notificationSettings,
		query,
	} = args;

	const compositeQuery = compositeQueryToQueryEnvelope({
		builderQueries: {
			...mapQueryDataToApi(query.builder.queryData, 'queryName').data,
			...mapQueryDataToApi(query.builder.queryFormulas, 'queryName').data,
		},
		promQueries: mapQueryDataToApi(query.promql, 'name').data,
		chQueries: mapQueryDataToApi(query.clickhouse_sql, 'name').data,
		queryType: query.queryType,
		panelType: PANEL_TYPES.TIME_SERIES,
		unit: basicAlertState.yAxisUnit,
	});

	// Thresholds
	const thresholds: BasicThreshold[] = thresholdState.thresholds.map(
		(threshold) => ({
			name: threshold.label,
			target: parseFloat(threshold.thresholdValue.toString()),
			matchType: thresholdState.matchType,
			op: thresholdState.operator,
			channels: threshold.channels,
			targetUnit: threshold.unit,
		}),
	);

	// Alert on absent data
	const alertOnAbsentProps = getAlertOnAbsentProps(advancedOptions);

	// Enforce minimum datapoints
	const enforceMinimumDatapointsProps = getEnforceMinimumDatapointsProps(
		advancedOptions,
	);

	// Notification settings
	const notificationSettingsProps = getNotificationSettingsProps(
		notificationSettings,
	);

	// Evaluation
	const evaluationProps = getEvaluationProps(evaluationWindow, advancedOptions);

	let ruleType: string = AlertDetectionTypes.THRESHOLD_ALERT;
	if (query.queryType === EQueryType.PROM) {
		ruleType = 'promql_rule';
	}

	return {
		alert: basicAlertState.name,
		ruleType,
		alertType,
		condition: {
			thresholds: {
				kind: 'basic',
				spec: thresholds,
			},
			compositeQuery,
			selectedQueryName: thresholdState.selectedQuery,
			...alertOnAbsentProps,
			...enforceMinimumDatapointsProps,
		},
		evaluation: evaluationProps,
		labels: basicAlertState.labels,
		annotations: {
			description: notificationSettings.description,
			summary: notificationSettings.description,
		},
		notificationSettings: notificationSettingsProps,
		version: 'v5',
		schemaVersion: 'v2alpha1',
		source: window?.location.toString(),
	};
}

// Build Create Anomaly Alert Rule Payload
// TODO: Update this function before enabling anomaly alert rule creation
export function buildCreateAnomalyAlertRulePayload(
	args: BuildCreateAlertRulePayloadArgs,
): PostableAlertRuleV2 {
	const {
		alertType,
		basicAlertState,
		query,
		notificationSettings,
		evaluationWindow,
		advancedOptions,
	} = args;

	const compositeQuery = compositeQueryToQueryEnvelope({
		builderQueries: {
			...mapQueryDataToApi(query.builder.queryData, 'queryName').data,
			...mapQueryDataToApi(query.builder.queryFormulas, 'queryName').data,
		},
		promQueries: mapQueryDataToApi(query.promql, 'name').data,
		chQueries: mapQueryDataToApi(query.clickhouse_sql, 'name').data,
		queryType: query.queryType,
		panelType: PANEL_TYPES.TIME_SERIES,
		unit: basicAlertState.yAxisUnit,
	});

	const alertOnAbsentProps = getAlertOnAbsentProps(advancedOptions);
	const enforceMinimumDatapointsProps = getEnforceMinimumDatapointsProps(
		advancedOptions,
	);
	const evaluationProps = getEvaluationProps(evaluationWindow, advancedOptions);
	const notificationSettingsProps = getNotificationSettingsProps(
		notificationSettings,
	);

	return {
		alert: basicAlertState.name,
		ruleType: AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
		alertType,
		condition: {
			compositeQuery,
			...alertOnAbsentProps,
			...enforceMinimumDatapointsProps,
		},
		labels: basicAlertState.labels,
		annotations: {
			description: notificationSettings.description,
			summary: notificationSettings.description,
		},
		notificationSettings: notificationSettingsProps,
		evaluation: evaluationProps,
		version: '',
		schemaVersion: '',
		source: window?.location.toString(),
	};
}

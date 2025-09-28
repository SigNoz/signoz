import { CreateAlertRuleProps } from 'api/alerts/createAlertRule';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { mapQueryDataToApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataToApi';
import { ApiEvaluation, ApiThreshold } from 'types/api/alerts/alertsV2';
import { compositeQueryToQueryEnvelope } from 'utils/compositeQueryToQueryEnvelope';

import { BuildCreateAlertRulePayloadArgs } from './types';

function getFormattedTimeValue(timeValue: number, unit: string): string {
	return `${timeValue}${unit}`;
}

export function buildCreateThresholdAlertRulePayload(
	args: BuildCreateAlertRulePayloadArgs,
): CreateAlertRuleProps {
	const {
		alertType,
		basicAlertState,
		thresholdState,
		evaluationWindow,
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

	const thresholdSpecs: ApiThreshold[] = thresholdState.thresholds.map(
		(threshold) => ({
			name: threshold.label,
			target: threshold.thresholdValue,
			matchType: thresholdState.matchType,
			op: thresholdState.operator,
			selectedQuery: thresholdState.selectedQuery,
			channels: threshold.channels,
			targetUnit: threshold.unit,
			ruleUnit: basicAlertState.yAxisUnit || '',
			recoveryTarget: threshold.recoveryThresholdValue,
		}),
	);

	const renotify = notificationSettings.reNotification.enabled
		? getFormattedTimeValue(
				notificationSettings.reNotification.value,
				notificationSettings.reNotification.unit,
		  )
		: '';

	return {
		alert: basicAlertState.name,
		alertType,
		condition: {
			thresholds: {
				kind: 'basic',
				specs: thresholdSpecs,
			},
			compositeQuery,
			op: thresholdState.operator,
			target: thresholdState.thresholds[0].thresholdValue,
			matchType: thresholdState.matchType,
			algorithm: thresholdState.algorithm,
			seasonality: thresholdState.seasonality,
			selectedQueryName: thresholdState.selectedQuery,
		},
		evaluation: {
			kind: evaluationWindow.timeframe as ApiEvaluation,
			spec: {
				evalWindow: evaluationWindow.timeframe,
				frequency: evaluationWindow.timeframe,
			},
		},
		labels: basicAlertState.labels,
		annotations: {
			description: notificationSettings.description,
			summary: notificationSettings.description,
		},
		disabled: false,
		source: '',
		preferredChannels: [],
		notificationGroups: notificationSettings.multipleNotifications || [],
		renotify,
		version: '',
		broadcastToAll: false,
	};
}

export function buildCreateAnomalyAlertRulePayload(
	args: BuildCreateAlertRulePayloadArgs,
): CreateAlertRuleProps {
	const { alertType, basicAlertState, thresholdState, query } = args;

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

	return {
		alert: basicAlertState.name,
		alertType,
		condition: {
			compositeQuery,
			op: thresholdState.operator,
			target: thresholdState.thresholds[0].thresholdValue,
			matchType: thresholdState.matchType,
			algorithm: thresholdState.algorithm,
			seasonality: thresholdState.seasonality,
			selectedQueryName: thresholdState.selectedQuery,
		},
		evaluation: {
			kind: 'rolling',
			spec: {
				evalWindow: '',
				frequency: '',
			},
		},
		labels: {},
		annotations: {
			description: '',
			summary: '',
		},
		disabled: false,
		source: '',
		preferredChannels: [],
		notificationGroups: [],
		version: '',
		broadcastToAll: false,
	};
}

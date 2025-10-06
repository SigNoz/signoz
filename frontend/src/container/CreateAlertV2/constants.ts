import { ENTITY_VERSION_V5 } from 'constants/app';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryPromQLData,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	NEW_ALERT_SCHEMA_VERSION,
	PostableAlertRuleV2,
} from 'types/api/alerts/alertTypesV2';
import { EQueryType } from 'types/common/dashboard';

const defaultAnnotations = {
	description:
		'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})',
	summary:
		'The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}',
};

const defaultNotificationSettings: PostableAlertRuleV2['notificationSettings'] = {
	groupBy: [],
	renotify: {
		enabled: false,
		interval: '30m',
		alertStates: [],
	},
	usePolicy: false,
};

const defaultEvaluation: PostableAlertRuleV2['evaluation'] = {
	kind: 'rolling',
	spec: {
		evalWindow: '5m0s',
		frequency: '1m',
	},
};

export const defaultPostableAlertRuleV2: PostableAlertRuleV2 = {
	alertType: AlertTypes.METRICS_BASED_ALERT,
	version: ENTITY_VERSION_V5,
	schemaVersion: NEW_ALERT_SCHEMA_VERSION,
	condition: {
		compositeQuery: {
			builderQueries: {
				A: initialQueryBuilderFormValuesMap.metrics,
			},
			promQueries: { A: initialQueryPromQLData },
			chQueries: {
				A: {
					name: 'A',
					query: ``,
					legend: '',
					disabled: false,
				},
			},
			queryType: EQueryType.QUERY_BUILDER,
			panelType: PANEL_TYPES.TIME_SERIES,
			unit: undefined,
		},
		selectedQueryName: 'A',
		alertOnAbsent: true,
		absentFor: 10,
		requireMinPoints: false,
		requiredNumPoints: 0,
	},
	labels: {
		severity: 'warning',
	},
	annotations: defaultAnnotations,
	notificationSettings: defaultNotificationSettings,
	alert: 'TEST_ALERT',
	evaluation: defaultEvaluation,
};

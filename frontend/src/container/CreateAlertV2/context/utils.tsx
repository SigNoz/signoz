import { QueryParams } from 'constants/query';
import {
	alertDefaults,
	anamolyAlertDefaults,
	exceptionAlertDefaults,
	logAlertDefaults,
	traceAlertDefaults,
} from 'container/CreateAlertRule/defaults';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { AlertState, CreateAlertAction } from './types';

export const alertCreationReducer = (
	state: AlertState,
	action: CreateAlertAction,
): AlertState => {
	switch (action.type) {
		case 'SET_ALERT_NAME':
			return {
				...state,
				name: action.payload,
			};
		case 'SET_ALERT_DESCRIPTION':
			return {
				...state,
				description: action.payload,
			};
		case 'SET_ALERT_LABELS':
			return {
				...state,
				labels: action.payload,
			};
		default:
			return state;
	}
};

export function getInitialAlertType(currentQuery: Query): AlertTypes {
	const dataSource =
		currentQuery.builder.queryData[0].dataSource || DataSource.METRICS;
	switch (dataSource) {
		case DataSource.METRICS:
			return AlertTypes.METRICS_BASED_ALERT;
		case DataSource.LOGS:
			return AlertTypes.LOGS_BASED_ALERT;
		case DataSource.TRACES:
			return AlertTypes.TRACES_BASED_ALERT;
		default:
			return AlertTypes.METRICS_BASED_ALERT;
	}
}

export function buildInitialAlertDef(alertType: AlertTypes): AlertDef {
	switch (alertType) {
		case AlertTypes.LOGS_BASED_ALERT:
			return logAlertDefaults;
		case AlertTypes.TRACES_BASED_ALERT:
			return traceAlertDefaults;
		case AlertTypes.EXCEPTIONS_BASED_ALERT:
			return exceptionAlertDefaults;
		case AlertTypes.ANOMALY_BASED_ALERT:
			return anamolyAlertDefaults;
		case AlertTypes.METRICS_BASED_ALERT:
			return alertDefaults;
		default:
			return alertDefaults;
	}
}

export function getInitialAlertTypeFromURL(
	urlSearchParams: URLSearchParams,
	currentQuery: Query,
): AlertTypes {
	const alertTypeFromURL = urlSearchParams.get(QueryParams.alertType);
	return alertTypeFromURL
		? (alertTypeFromURL as AlertTypes)
		: getInitialAlertType(currentQuery);
}

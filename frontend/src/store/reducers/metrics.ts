import {
	customMetricsItem,
	dbOverviewMetricsItem,
	externalErrCodeMetricsItem,
	externalMetricsAvgDurationItem,
	externalMetricsItem,
	metricItem,
	servicesListItem,
	topEndpointListItem,
} from 'store/actions/MetricsActions';
import { MetricsActionTypes as ActionTypes } from 'store/actions/MetricsActions/metricsActionTypes';

export type MetricsInitialState = {
	serviceList?: servicesListItem[];
	metricItems?: metricItem[];
	topEndpointListItem?: topEndpointListItem[];
	externalMetricsAvgDurationItem?: externalMetricsAvgDurationItem[];
	externalErrCodeMetricsItem?: externalErrCodeMetricsItem[];
	externalMetricsItem?: externalMetricsItem[];
	dbOverviewMetricsItem?: dbOverviewMetricsItem[];
	customMetricsItem?: customMetricsItem[];
	loading: boolean;
};
export const metricsInitialState: MetricsInitialState = {
	serviceList: [],
	metricItems: [],
	topEndpointListItem: [],
	externalMetricsAvgDurationItem: [],
	externalErrCodeMetricsItem: [],
	externalMetricsItem: [],
	dbOverviewMetricsItem: [],
	customMetricsItem: [],
	loading: false,
};

type ActionType = {
	type: string;
	payload: any;
};

export const metricsReducer = (
	state: MetricsInitialState = metricsInitialState,
	action: ActionType,
) => {
	switch (action.type) {
		case ActionTypes.getFilteredTraceMetrics:
			return {
				...state,
				customMetricsItem: action.payload,
			};
		case ActionTypes.getServiceMetrics:
			return {
				...state,
				metricItems: action.payload,
			};
		case ActionTypes.getDbOverviewMetrics:
			return {
				...state,
				dbOverviewMetricsItem: action.payload,
			};
		case ActionTypes.getExternalMetrics:
			return {
				...state,
				externalMetricsItem: action.payload,
			};
		case ActionTypes.getTopEndpoints:
			return {
				...state,
				topEndpointListItem: action.payload,
			};
		case ActionTypes.getErrCodeMetrics:
			return {
				...state,
				externalErrCodeMetricsItem: action.payload,
			};
		case ActionTypes.getAvgDurationMetrics:
			return {
				...state,
				externalMetricsAvgDurationItem: action.payload,
			};

		case ActionTypes.getServicesList:
			return {
				...state,
				serviceList: action.payload,
			};

		case 'UPDATE_INITIAL_VALUE_START': {
			return {
				...state,
				loading: true,
			};
		}

		case 'UPDATE_INITIAL_VALUE': {
			return {
				...state,
				dbOverviewMetricsItem: action.payload.dbResponse,
				topEndpointListItem: action.payload.topEndPointsResponse,
				externalMetricsAvgDurationItem: action.payload.avgExternalDurationResponse,
				externalErrCodeMetricsItem: action.payload.externalErrorCodeMetricsResponse,
				metricItems: action.payload.serviceOverViewResponse,
				externalMetricsItem: action.payload.externalServiceResponse,
				loading: false,
			};
		}
		default:
			return {
				...state,
			};
	}
};

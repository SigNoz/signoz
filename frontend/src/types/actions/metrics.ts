import { ServicesList } from 'types/api/metrics/getService';
import { ServiceOverview } from 'types/api/metrics/getServiceOverview';
import { TopEndPoints } from 'types/api/metrics/getTopEndPoints';
import { queryEndpointData } from 'types/api/metrics/getQueryEndpoint';

export const GET_SERVICE_LIST_SUCCESS = 'GET_SERVICE_LIST_SUCCESS';
export const GET_SERVICE_LIST_LOADING_START = 'GET_SERVICE_LIST_LOADING_START';
export const GET_SERVICE_LIST_ERROR = 'GET_SERVICE_LIST_ERROR';
export const GET_INITIAL_APPLICATION_LOADING =
	'GET_INITIAL_APPLICATION_LOADING';
export const GET_INITIAL_APPLICATION_ERROR = 'GET_INITIAL_APPLICATION_ERROR';
export const RESET_INITIAL_APPLICATION_DATA = 'RESET_INITIAL_APPLICATION_DATA';
export const GET_INITIAL_APPLICATION_METRICS =
	'GET_INITIAL_APPLICATION_METRICS';
export const GET_INITIAL_DATABASE_METRICS = 'GET_INITIAL_DATABASE_METRICS';
export const GET_INITIAL_EXTERNAL_CALL_METRICS =
	'GET_INITIAL_EXTERNAL_CALL_METRICS';

export interface GetServiceList {
	type: typeof GET_SERVICE_LIST_SUCCESS;
	payload: ServicesList[];
}

export interface GetServiceListLoading {
	type:
		| typeof GET_SERVICE_LIST_LOADING_START
		| typeof GET_INITIAL_APPLICATION_LOADING;
}

export interface GetServiceListError {
	type: typeof GET_SERVICE_LIST_ERROR | typeof GET_INITIAL_APPLICATION_ERROR;
	payload: {
		errorMessage: string;
	};
}

export interface GetInitialApplicationMetrics {
	type: typeof GET_INITIAL_APPLICATION_METRICS;
	payload: {
		serviceOverview: ServiceOverview[];
		topEndPoints: TopEndPoints[];
		applicationRpsEndpoints: queryEndpointData[];
		applicationErrorEndpoints: queryEndpointData[];
	};
}

export interface GetInitialDatabaseMetrics {
	type: typeof GET_INITIAL_DATABASE_METRICS;
	payload: {
		dbRpsEndpoints: queryEndpointData[];
		dbAvgDurationEndpoints: queryEndpointData[];
	};
}

export interface GetInitialExternalCallMetrics {
	type: typeof GET_INITIAL_EXTERNAL_CALL_METRICS;
	payload: {
		externalCallEndpoint: queryEndpointData[];
		externalErrorEndpoints: queryEndpointData[];
		addressedExternalCallRPSResponse: queryEndpointData[];
		addressedExternalCallDurationResponse: queryEndpointData[];
	};
}

export interface ResetInitialApplicationData {
	type: typeof RESET_INITIAL_APPLICATION_DATA;
}

export type MetricsActions =
	| GetServiceListError
	| GetServiceListLoading
	| GetServiceList
	| GetInitialApplicationMetrics
	| GetInitialDatabaseMetrics
	| GetInitialExternalCallMetrics
	| ResetInitialApplicationData;

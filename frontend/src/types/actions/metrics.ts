// import { DBOverView } from 'types/api/metrics/getDBOverview';
// import { ExternalAverageDuration } from 'types/api/metrics/getExternalAverageDuration';
// import { ExternalError } from 'types/api/metrics/getExternalError';
// import { ExternalService } from 'types/api/metrics/getExternalService';
import { ServicesList } from 'types/api/metrics/getService';
import { ServiceOverview } from 'types/api/metrics/getServiceOverview';
import { TopEndPoints } from 'types/api/metrics/getTopEndPoints';

export const GET_SERVICE_LIST_SUCCESS = 'GET_SERVICE_LIST_SUCCESS';
export const GET_SERVICE_LIST_LOADING_START = 'GET_SERVICE_LIST_LOADING_START';
export const GET_SERVICE_LIST_ERROR = 'GET_SERVICE_LIST_ERROR';
export const GET_INITIAL_APPLICATION_LOADING =
	'GET_INITIAL_APPLICATION_LOADING';
export const GET_INITIAL_APPLICATION_ERROR = 'GET_INITIAL_APPLICATION_ERROR';
export const GET_INTIAL_APPLICATION_DATA = 'GET_INTIAL_APPLICATION_DATA';
export const RESET_INITIAL_APPLICATION_DATA = 'RESET_INITIAL_APPLICATION_DATA';
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

export interface GetInitialApplicationData {
	type: typeof GET_INTIAL_APPLICATION_DATA;
	payload: {
		topEndPoints: TopEndPoints[];
		// dbOverView: DBOverView[];
		// externalService: ExternalService[];
		// externalAverageDuration: ExternalAverageDuration[];
		// externalError: ExternalError[];
		serviceOverview: ServiceOverview[];
	};
}

export interface ResetInitialApplicationData {
	type: typeof RESET_INITIAL_APPLICATION_DATA;
}

export type MetricsActions =
	| GetServiceListError
	| GetServiceListLoading
	| GetServiceList
	| GetInitialApplicationData
	| ResetInitialApplicationData;

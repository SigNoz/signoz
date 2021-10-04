export const GET_SERVICE_LIST_SUCCESS = 'GET_SERVICE_LIST_SUCCESS';
export const GET_SERVICE_LIST_LOADING_START = 'GET_SERVICE_LIST_LOADING_START';
export const GET_SERVICE_LIST_ERROR = 'GET_SERVICE_LIST_ERROR';

export interface ServicesList {
	serviceName: string;
	p99: number;
	avgDuration: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
}

export interface GetServiceList {
	type: typeof GET_SERVICE_LIST_SUCCESS;
	payload: ServicesList[];
}

export interface GetServiceListLoading {
	type: typeof GET_SERVICE_LIST_LOADING_START;
}

export interface GetServiceListError {
	type: typeof GET_SERVICE_LIST_ERROR;
	payload: {
		errorMessage: string;
	};
}

export type MetricsActions =
	| GetServiceListError
	| GetServiceListLoading
	| GetServiceList;

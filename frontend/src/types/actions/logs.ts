// import { DBOverView } from 'types/api/metrics/getDBOverview';
// import { ExternalAverageDuration } from 'types/api/metrics/getExternalAverageDuration';
// import { ExternalError } from 'types/api/metrics/getExternalError';
// import { ExternalService } from 'types/api/metrics/getExternalService';
// import { IResourceAttributeQuery } from 'container/MetricsApplication/ResourceAttributesFilter/types';
// import { ServicesList } from 'types/api/metrics/getService';
// import { ServiceOverview } from 'types/api/metrics/getServiceOverview';
// import { TopEndPoints } from 'types/api/metrics/getTopEndPoints';

import { ILogQLParsedQueryItem } from 'lib/logql/types';
import { IFieldMoveToSelected, IFields } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

// export const GET_SERVICE_LIST_SUCCESS = 'GET_SERVICE_LIST_SUCCESS';
// export const GET_SERVICE_LIST_LOADING_START = 'GET_SERVICE_LIST_LOADING_START';
// export const GET_SERVICE_LIST_ERROR = 'GET_SERVICE_LIST_ERROR';
// export const GET_INITIAL_APPLICATION_LOADING =
// 	'GET_INITIAL_APPLICATION_LOADING';
// export const GET_INITIAL_APPLICATION_ERROR = 'GET_INITIAL_APPLICATION_ERROR';
// export const GET_INTIAL_APPLICATION_DATA = 'GET_INTIAL_APPLICATION_DATA';
// export const RESET_INITIAL_APPLICATION_DATA = 'RESET_INITIAL_APPLICATION_DATA';
export const GET_FIELDS = 'LOGS_GET_FIELDS';
export const SET_FIELDS = 'LOGS_SET_FIELDS';
export const SET_SEARCH_QUERY_STRING = 'LOGS_SET_SEARCH_QUERY_STRING';
export const SET_SEARCH_QUERY_PARSED_PAYLOAD =
	'LOGS_SET_SEARCH_QUERY_PARSED_PAYLOAD';
export const ADD_SEARCH_FIELD_QUERY_STRING =
	'LOGS_ADD_SEARCH_FIELD_QUERY_STRING';
export const ADD_TO_SELECTED_FIELD = 'LOGS_ADD_TO_SELECTED_FIELD';
export const SET_LOGS = 'LOGS_SET_LOGS';
export const SET_LOG_LINES_PER_PAGE = 'LOGS_SET_LOG_LINES_PER_PAGE';
export const GET_NEXT_LOG_LINES = 'LOGS_GET_NEXT_LOG_LINES';
export const GET_PREVIOUS_LOG_LINES = 'LOGS_GET_PREVIOUS_LOG_LINES';
export const RESET_ID_START_AND_END = 'LOGS_RESET_ID_START_AND_END';
export const SET_LOADING = 'LOGS_SET_LOADING';
export interface GetFields {
	type: typeof GET_FIELDS;
}

export interface SetFields {
	type: typeof SET_FIELDS;
	payload: IFields;
}
export interface SetSearchQueryString {
	type: typeof SET_SEARCH_QUERY_STRING;
	payload: string;
}

export interface SetSearchQueryParsedPayload {
	type: typeof SET_SEARCH_QUERY_PARSED_PAYLOAD;
	payload: ILogQLParsedQueryItem[];
}
export interface AddSearchFieldQueryString {
	type: typeof ADD_SEARCH_FIELD_QUERY_STRING;
	payload: string;
}
export interface AddToSelectedField {
	type: typeof ADD_TO_SELECTED_FIELD;
	payload: IFieldMoveToSelected;
}

export interface UpdateLogs {
	type: typeof SET_LOGS;
	payload: ILog[];
}
export interface SetLogsLinesPerPage {
	type: typeof SET_LOG_LINES_PER_PAGE;
	payload: number;
}

export interface PreviousLogsLines {
	type: typeof GET_PREVIOUS_LOG_LINES;
}
export interface NextLogsLines {
	type: typeof GET_NEXT_LOG_LINES;
}
export interface ResetIdStartAndEnd {
	type: typeof RESET_ID_START_AND_END;
}
export interface SetLoading {
	type: typeof SET_LOADING;
	payload: boolean;
}
// export interface GetServiceListLoading {
// 	type:
// 		| typeof GET_SERVICE_LIST_LOADING_START
// 		| typeof GET_INITIAL_APPLICATION_LOADING;
// }

// export interface GetServiceListError {
// 	type: typeof GET_SERVICE_LIST_ERROR | typeof GET_INITIAL_APPLICATION_ERROR;
// 	payload: {
// 		errorMessage: string;
// 	};
// }

// export interface GetInitialApplicationData {
// 	type: typeof GET_INTIAL_APPLICATION_DATA;
// 	payload: {
// 		topEndPoints: TopEndPoints[];
// 		// dbOverView: DBOverView[];
// 		// externalService: ExternalService[];
// 		// externalAverageDuration: ExternalAverageDuration[];
// 		// externalError: ExternalError[];
// 		serviceOverview: ServiceOverview[];
// 	};
// }

// export interface ResetInitialApplicationData {
// 	type: typeof RESET_INITIAL_APPLICATION_DATA;
// }

// export interface SetResourceAttributeQueries {
// 	type: typeof SET_RESOURCE_ATTRIBUTE_QUERIES;
// 	payload: {
// 		queries: IResourceAttributeQuery[];
// 		promQLQuery: string;
// 	};
// }

export type LogsActions =
	| GetFields
	| SetFields
	| SetSearchQueryString
	| SetSearchQueryParsedPayload
	| AddSearchFieldQueryString
	| AddToSelectedField
	| UpdateLogs
	| SetLogsLinesPerPage
	| PreviousLogsLines
	| NextLogsLines
	| ResetIdStartAndEnd
	| SetLoading;

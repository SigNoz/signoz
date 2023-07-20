import { LogViewMode } from 'container/LogsTable';
import { Pagination } from 'hooks/queryPagination';
import { ILogQLParsedQueryItem } from 'lib/logql/types';
import { OrderPreferenceItems } from 'pages/Logs/config';
import { IField, IFieldMoveToSelected, IFields } from 'types/api/logs/fields';
import { TLogsLiveTailState } from 'types/api/logs/liveTail';
import { ILog } from 'types/api/logs/log';
import { ILogsAggregate } from 'types/api/logs/logAggregate';

import { GlobalTime } from './globalTime';

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
export const SET_LOADING_AGGREGATE = 'LOGS_SET_LOADING_AGGREGATE';
export const SET_LOGS_AGGREGATE_SERIES = 'LOGS_SET_LOGS_AGGREGATE_SERIES';
export const SET_DETAILED_LOG_DATA = 'LOGS_SET_DETAILED_LOG_DATA';
export const TOGGLE_LIVE_TAIL = 'LOGS_TOGGLE_LIVE_TAIL';
export const PUSH_LIVE_TAIL_EVENT = 'LOGS_PUSH_LIVE_TAIL_EVENT';
export const STOP_LIVE_TAIL = 'LOGS_STOP_LIVE_TAIL';
export const FLUSH_LOGS = 'LOGS_FLUSH_LOGS';
export const SET_LIVE_TAIL_START_TIME = 'LOGS_SET_LIVE_TAIL_START_TIME';
export const SET_LINES_PER_ROW = 'SET_LINES_PER_ROW';
export const SET_VIEW_MODE = 'SET_VIEW_MODE';
export const UPDATE_SELECTED_FIELDS = 'LOGS_UPDATE_SELECTED_FIELDS';
export const UPDATE_INTERESTING_FIELDS = 'LOGS_UPDATE_INTERESTING_FIELDS';
export const SET_LOGS_ORDER = 'SET_LOGS_ORDER';

export interface GetFields {
	type: typeof GET_FIELDS;
}

export interface SetFields {
	type: typeof SET_FIELDS;
	payload: IFields;
}
export interface SetSearchQueryString {
	type: typeof SET_SEARCH_QUERY_STRING;
	payload: {
		searchQueryString: string;
		globalTime?: GlobalTime;
	};
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
	payload: {
		logsLinesPerPage: Pagination['limit'];
	};
}

export interface PreviousLogsLines {
	type: typeof GET_PREVIOUS_LOG_LINES;
}
export interface NextLogsLines {
	type: typeof GET_NEXT_LOG_LINES;
}
export interface ResetIdStartAndEnd {
	type: typeof RESET_ID_START_AND_END;
	payload: GlobalTime;
}
export interface SetLoading {
	type: typeof SET_LOADING;
	payload: boolean;
}
export interface SetLoadingAggregate {
	type: typeof SET_LOADING_AGGREGATE;
	payload: boolean;
}

export interface SetLogsAggregateSeries {
	type: typeof SET_LOGS_AGGREGATE_SERIES;
	payload: ILogsAggregate[];
}
export interface SetDetailedLogData {
	type: typeof SET_DETAILED_LOG_DATA;
	payload: ILog | null;
}

export interface ToggleLiveTail {
	type: typeof TOGGLE_LIVE_TAIL;
	payload: TLogsLiveTailState;
}
export interface PushLiveTailEvent {
	type: typeof PUSH_LIVE_TAIL_EVENT;
	payload: ILog[];
}
export interface StopLiveTail {
	type: typeof STOP_LIVE_TAIL;
}
export interface FlushLogs {
	type: typeof FLUSH_LOGS;
}
export interface SetLiveTailStartTime {
	type: typeof SET_LIVE_TAIL_START_TIME;
	payload: number;
}

export interface SetLinesPerRow {
	type: typeof SET_LINES_PER_ROW;
	payload: number;
}

export interface SetViewMode {
	type: typeof SET_VIEW_MODE;
	payload: LogViewMode;
}
type IFieldType = 'interesting' | 'selected';

export interface UpdateSelectedInterestFields {
	type: typeof UPDATE_INTERESTING_FIELDS | typeof UPDATE_SELECTED_FIELDS;
	payload: {
		field: IField[];
		type: IFieldType;
	};
}

export interface SetLogsOrder {
	type: typeof SET_LOGS_ORDER;
	payload: OrderPreferenceItems;
}

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
	| SetLoading
	| SetLoadingAggregate
	| SetLogsAggregateSeries
	| SetDetailedLogData
	| ToggleLiveTail
	| PushLiveTailEvent
	| StopLiveTail
	| FlushLogs
	| SetLiveTailStartTime
	| SetLinesPerRow
	| SetViewMode
	| UpdateSelectedInterestFields
	| SetLogsOrder;

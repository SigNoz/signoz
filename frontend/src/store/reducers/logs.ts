import { parseQuery } from 'lib/logql';
import {
	ADD_SEARCH_FIELD_QUERY_STRING,
	GET_FIELDS,
	GET_NEXT_LOG_LINES,
	GET_PREVIOUS_LOG_LINES,
	LogsActions,
	RESET_ID_START_AND_END,
	SET_FIELDS,
	SET_LOADING,
	SET_LOADING_AGGREGATE,
	SET_LOG_LINES_PER_PAGE,
	SET_LOGS,
	SET_SEARCH_QUERY_PARSED_PAYLOAD,
	SET_SEARCH_QUERY_STRING,
	SET_LOGS_AGGREGATE_SERIES,
} from 'types/actions/logs';
import ILogsReducer from 'types/reducer/logs';

const initialState: ILogsReducer = {
	fields: {
		interesting: [],
		selected: [],
	},
	searchFilter: {
		queryString: '',
		parsedQuery: [],
	},
	logs: [],
	logLinesPerPage: 10,
	idEnd: '',
	idStart: '',
	isLoading: false,
	isLoadingAggregate: false,
	logsAggregate: [],
};

export const LogsReducer = (
	state = initialState,
	action: LogsActions,
): ILogsReducer => {
	switch (action.type) {
		case SET_LOADING: {
			return {
				...state,
				isLoading: action.payload,
			};
		}

		case SET_LOADING_AGGREGATE: {
			return {
				...state,
				isLoadingAggregate: action.payload,
			};
		}

		case GET_FIELDS:
			return {
				...state,
			};

		case SET_FIELDS: {
			const newFields = action.payload;

			return {
				...state,
				fields: newFields,
			};
		}

		case SET_SEARCH_QUERY_STRING: {
			return {
				...state,
				searchFilter: {
					...state.searchFilter,
					queryString: action.payload,
				},
			};
		}

		case SET_SEARCH_QUERY_PARSED_PAYLOAD: {
			return {
				...state,
				searchFilter: {
					...state.searchFilter,
					parsedQuery: action.payload,
				},
			};
		}

		case ADD_SEARCH_FIELD_QUERY_STRING: {
			const updatedQueryString =
				state.searchFilter.queryString +
				(state.searchFilter.queryString.length > 0 ? ' and ' : '') +
				action.payload;

			const updatedParsedQuery = parseQuery(updatedQueryString);
			return {
				...state,
				searchFilter: {
					...state.searchFilter,
					queryString: updatedQueryString,
					parsedQuery: updatedParsedQuery,
				},
			};
		}

		case SET_LOGS: {
			const logsData = action.payload;
			return {
				...state,
				logs: logsData,
			};
		}
		case SET_LOG_LINES_PER_PAGE: {
			return {
				...state,
				logLinesPerPage: action.payload,
			};
		}

		case GET_PREVIOUS_LOG_LINES: {
			const idStart = state.logs.length > 0 ? state.logs[0].id : '';
			return {
				...state,
				idStart,
				idEnd: '',
			};
		}

		case GET_NEXT_LOG_LINES: {
			const idEnd =
				state.logs.length > 0 ? state.logs[state.logs.length - 1].id : '';
			return {
				...state,
				idStart: '',
				idEnd,
			};
		}

		case RESET_ID_START_AND_END: {
			return {
				...state,
				idEnd: '',
				idStart: '',
			};
		}

		case SET_LOGS_AGGREGATE_SERIES: {
			return {
				...state,
				logsAggregate: action.payload,
			};
		}
		default:
			return state;
	}
};

export default LogsReducer;

import ROUTES from 'constants/routes';
import { parseQuery } from 'lib/logql';
import { OrderPreferenceItems } from 'pages/Logs/config';
import {
	ADD_SEARCH_FIELD_QUERY_STRING,
	FLUSH_LOGS,
	GET_FIELDS,
	GET_NEXT_LOG_LINES,
	GET_PREVIOUS_LOG_LINES,
	LogsActions,
	PUSH_LIVE_TAIL_EVENT,
	RESET_ID_START_AND_END,
	SET_DETAILED_LOG_DATA,
	SET_FIELDS,
	SET_LINES_PER_ROW,
	SET_LIVE_TAIL_START_TIME,
	SET_LOADING,
	SET_LOADING_AGGREGATE,
	SET_LOG_LINES_PER_PAGE,
	SET_LOGS,
	SET_LOGS_AGGREGATE_SERIES,
	SET_LOGS_ORDER,
	SET_SEARCH_QUERY_PARSED_PAYLOAD,
	SET_SEARCH_QUERY_STRING,
	SET_VIEW_MODE,
	STOP_LIVE_TAIL,
	TOGGLE_LIVE_TAIL,
	UPDATE_INTERESTING_FIELDS,
	UPDATE_SELECTED_FIELDS,
} from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

const supportedLogsOrder = [
	OrderPreferenceItems.ASC,
	OrderPreferenceItems.DESC,
];

function getLogsOrder(): OrderPreferenceItems {
	// set the value of order from the URL only when order query param is present and the user is landing on the old logs explorer page
	if (window.location.pathname === ROUTES.OLD_LOGS_EXPLORER) {
		const orderParam = new URLSearchParams(window.location.search).get('order');

		if (orderParam) {
			// check if the order passed is supported else pass the default order
			if (supportedLogsOrder.includes(orderParam as OrderPreferenceItems)) {
				return orderParam as OrderPreferenceItems;
			}

			return OrderPreferenceItems.DESC;
		}
		return OrderPreferenceItems.DESC;
	}

	return OrderPreferenceItems.DESC;
}

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
	logLinesPerPage: 200,
	linesPerRow: 2,
	viewMode: 'raw',
	idEnd: '',
	idStart: '',
	isLoading: false,
	isLoadingAggregate: false,
	logsAggregate: [],
	liveTail: 'STOPPED',
	liveTailStartRange: 15,
	selectedLogId: null,
	detailedLog: null,
	order: getLogsOrder(),
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
					queryString: action.payload.searchQueryString,
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
			const updatedQueryString = `${state?.searchFilter?.queryString || ''}${
				state.searchFilter.queryString && state.searchFilter.queryString.length > 0
					? ' and '
					: ''
			}${action.payload}`;

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

		case SET_LOGS_ORDER: {
			const order = action.payload;
			return {
				...state,
				order,
				idStart: '',
				idEnd: '',
			};
		}

		case SET_LOG_LINES_PER_PAGE: {
			return {
				...state,
				logLinesPerPage: action.payload.logsLinesPerPage,
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

		case SET_DETAILED_LOG_DATA: {
			return {
				...state,
				detailedLog: action.payload,
			};
		}

		case TOGGLE_LIVE_TAIL: {
			return {
				...state,
				liveTail: action.payload,
			};
		}
		case STOP_LIVE_TAIL: {
			return {
				...state,
				logs: [],
				liveTail: 'STOPPED',
			};
		}
		case PUSH_LIVE_TAIL_EVENT: {
			return {
				...state,
				logs: action.payload.concat(state.logs).slice(0, 100),
			};
		}
		case SET_LIVE_TAIL_START_TIME: {
			return {
				...state,
				liveTailStartRange: action.payload,
			};
		}
		case FLUSH_LOGS: {
			return {
				...state,
				logs: [],
			};
		}

		case SET_LINES_PER_ROW: {
			return {
				...state,
				linesPerRow: action.payload,
			};
		}

		case SET_VIEW_MODE: {
			return {
				...state,
				viewMode: action.payload,
			};
		}

		case UPDATE_INTERESTING_FIELDS: {
			return {
				...state,
				fields: {
					...state.fields,
					interesting: action.payload.field,
				},
			};
		}

		case UPDATE_SELECTED_FIELDS: {
			return {
				...state,
				fields: {
					...state.fields,
					selected: action.payload.field,
				},
			};
		}

		default:
			return state;
	}
};

export default LogsReducer;

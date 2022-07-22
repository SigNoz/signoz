import { parseQuery } from 'lib/logql';
import {
	ADD_SEARCH_FIELD_QUERY_STRING,
	GET_FIELDS,
	LogsActions,
	SET_FIELDS,
	SET_SEARCH_QUERY_PARSED_PAYLOAD,
	SET_SEARCH_QUERY_STRING,
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
};

export const LogsReducer = (
	state = initialState,
	action: LogsActions,
): ILogsReducer => {
	switch (action.type) {
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

		default:
			return state;
	}
};

export default LogsReducer;

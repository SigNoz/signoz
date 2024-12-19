import {
	RESET_TRACE_FILTER,
	SELECT_TRACE_FILTER,
	TraceActions,
	UPDATE_ALL_FILTERS,
	UPDATE_FILTER_EXCLUDE,
	UPDATE_FILTER_RESPONSE_SELECTED,
	UPDATE_IS_TAG_ERROR,
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
	UPDATE_SELECTED_TAGS,
	UPDATE_SPAN_ORDER,
	UPDATE_SPAN_ORDER_PARAMS,
	UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE,
	UPDATE_SPANS_AGGREGATE,
	UPDATE_SPANS_AGGREGATE_PAGE_NUMBER,
	UPDATE_SPANS_AGGREGATE_PAGE_SIZE,
	UPDATE_TAG_MODAL_VISIBILITY,
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
	UPDATE_TRACE_GRAPH_ERROR,
	UPDATE_TRACE_GRAPH_LOADING,
	UPDATE_TRACE_GRAPH_SUCCESS,
} from 'types/actions/trace';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

export const INITIAL_FILTER_VALUE = 8;

const initialValue: TraceReducer = {
	filter: new Map(),
	filterToFetchData: ['duration', 'status', 'serviceName'],
	filterLoading: true,
	filterResponseSelected: new Set(),
	selectedFilter: new Map(),
	selectedTags: [],
	isTagModalOpen: false,
	isTagModalError: false,
	isFilterExclude: new Map<TraceFilterEnum, boolean>([]),
	userSelectedFilter: new Map(),
	spansAggregate: {
		currentPage: 1,
		loading: false,
		data: [],
		error: false,
		total: 0,
		pageSize: 10,
		order: '',
		orderParam: '',
	},
	selectedGroupBy: '',
	selectedFunction: 'count',
	yAxisUnit: '',
	spansGraph: {
		error: false,
		errorMessage: '',
		loading: true,
		payload: { items: {} },
	},
	filterDisplayValue: new Map<TraceFilterEnum, number>([
		['duration', INITIAL_FILTER_VALUE],
		['httpHost', INITIAL_FILTER_VALUE],
		['httpMethod', INITIAL_FILTER_VALUE],
		['httpUrl', INITIAL_FILTER_VALUE],
		['operation', INITIAL_FILTER_VALUE],
		['rpcMethod', INITIAL_FILTER_VALUE],
		['responseStatusCode', INITIAL_FILTER_VALUE],
		['serviceName', INITIAL_FILTER_VALUE],
		['status', INITIAL_FILTER_VALUE],
		['traceID', INITIAL_FILTER_VALUE],
	]),
	spanKind: undefined,
};

const traceReducer = (
	state = initialValue,
	action: TraceActions,
): TraceReducer => {
	switch (action.type) {
		case UPDATE_TRACE_FILTER: {
			return {
				...state,
				filter: action.payload.filter,
			};
		}

		case UPDATE_ALL_FILTERS: {
			const { payload } = action;
			const {
				filter,
				filterToFetchData,
				selectedFilter,
				current,
				selectedTags,
				userSelected,
				isFilterExclude,
				order,
				pageSize,
				orderParam,
				spanKind,
			} = payload;

			return {
				...state,
				filter,
				filterToFetchData,
				selectedFilter,
				selectedTags,
				userSelectedFilter: userSelected,
				isFilterExclude,
				spansAggregate: {
					...state.spansAggregate,
					currentPage: current,
					pageSize,
					order,
					orderParam,
				},
				spanKind,
			};
		}

		case UPDATE_TRACE_FILTER_LOADING: {
			return {
				...state,
				filterLoading: action.payload.filterLoading,
			};
		}

		case SELECT_TRACE_FILTER: {
			return {
				...state,
				selectedFilter: action.payload.selectedFilter,
			};
		}

		case RESET_TRACE_FILTER: {
			return {
				...initialValue,
			};
		}

		case UPDATE_SELECTED_TAGS: {
			return {
				...state,
				selectedTags: action.payload.selectedTags,
			};
		}

		case UPDATE_SPANS_AGGREGATE: {
			return {
				...state,
				spansAggregate: action.payload.spansAggregate,
			};
		}

		case UPDATE_TAG_MODAL_VISIBILITY: {
			return {
				...state,
				isTagModalOpen: action.payload.isTagModalOpen,
			};
		}

		case UPDATE_IS_TAG_ERROR: {
			return {
				...state,
				isTagModalError: action.payload.isTagModalError,
			};
		}

		case UPDATE_SELECTED_FUNCTION: {
			return {
				...state,
				selectedFunction: action.payload.selectedFunction,
				yAxisUnit: action.payload.yAxisUnit,
			};
		}

		case UPDATE_SELECTED_GROUP_BY: {
			return {
				...state,
				selectedGroupBy: action.payload.selectedGroupBy,
			};
		}

		case UPDATE_TRACE_GRAPH_LOADING: {
			return {
				...state,
				spansGraph: {
					...state.spansGraph,
					loading: action.payload.loading,
				},
			};
		}

		case UPDATE_TRACE_GRAPH_ERROR: {
			return {
				...state,
				spansGraph: {
					...state.spansGraph,
					error: action.payload.error,
					errorMessage: action.payload.errorMessage,
					loading: false,
				},
			};
		}

		case UPDATE_TRACE_GRAPH_SUCCESS: {
			return {
				...state,
				spansGraph: {
					...state.spansGraph,
					payload: action.payload.data,
					loading: false,
					error: false,
				},
			};
		}

		case UPDATE_FILTER_RESPONSE_SELECTED: {
			return {
				...state,
				filterResponseSelected: action.payload.filterResponseSelected,
			};
		}

		case UPDATE_FILTER_EXCLUDE: {
			return {
				...state,
				isFilterExclude: action.payload.isFilterExclude,
			};
		}

		case UPDATE_SPAN_ORDER: {
			return {
				...state,
				spansAggregate: {
					...state.spansAggregate,
					order: action.payload.order,
				},
			};
		}

		case UPDATE_SPANS_AGGREGATE_PAGE_NUMBER: {
			return {
				...state,
				spansAggregate: {
					...state.spansAggregate,
					currentPage: action.payload.currentPage,
				},
			};
		}

		case UPDATE_SPANS_AGGREGATE_PAGE_SIZE: {
			return {
				...state,
				spansAggregate: {
					...state.spansAggregate,
					pageSize: action.payload.pageSize,
				},
			};
		}

		case UPDATE_SPAN_ORDER_PARAMS: {
			return {
				...state,
				spansAggregate: {
					...state.spansAggregate,
					orderParam: action.payload.orderParam,
				},
			};
		}

		case UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE: {
			return {
				...state,
				filterDisplayValue: action.payload,
			};
		}

		default:
			return state;
	}
};

export default traceReducer;

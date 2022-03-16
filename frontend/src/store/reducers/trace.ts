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
	UPDATE_SPANS_AGGREEGATE,
	UPDATE_TAG_MODAL_VISIBLITY,
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
	UPDATE_TRACE_GRAPH_ERROR,
	UPDATE_TRACE_GRAPH_LOADING,
	UPDATE_TRACE_GRAPH_SUCCESS,
} from 'types/actions/trace';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

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
				},
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

		case UPDATE_SPANS_AGGREEGATE: {
			return {
				...state,
				spansAggregate: action.payload.spansAggregate,
			};
		}

		case UPDATE_TAG_MODAL_VISIBLITY: {
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

		default:
			return state;
	}
};

export default traceReducer;

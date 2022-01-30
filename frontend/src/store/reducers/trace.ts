import {
	SELECT_TRACE_FILTER,
	TraceActions,
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
	UPDATE_ALL_FILTERS,
	UPDATE_SELECTED_TAGS,
	UPDATE_SPANS_AGGREEGATE,
	UPDATE_TAG_MODAL_VISIBLITY,
	UPDATE_IS_TAG_ERROR,
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
	UPDATE_TRACE_GRAPH_LOADING,
	UPDATE_TRACE_GRAPH_ERROR,
	UPDATE_TRACE_GRAPH_SUCCESS,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

const initialValue: TraceReducer = {
	filter: new Map(),
	filterToFetchData: ['duration', 'status', 'serviceName'],
	filterLoading: true,
	selectedFilter: new Map(),
	selectedTags: [],
	isTagModalOpen: false,
	isTagModalError: false,
	preSelectedFilter: true,
	spansAggregate: {
		currentPage: 0,
		loading: false,
		data: [],
		error: false,
		total: 0,
		pageSize: 10,
	},
	selectedGroupBy: '',
	selectedFunction: 'count',
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
			} = payload;

			return {
				...state,
				filter,
				filterToFetchData,
				selectedFilter,
				selectedTags,
				preSelectedFilter: false,
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

		default:
			return state;
	}
};

export default traceReducer;

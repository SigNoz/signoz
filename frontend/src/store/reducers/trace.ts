import {
	SELECT_TRACE_FILTER,
	TraceActions,
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
	UPDATE_ALL_FILTERS,
	UPDATE_SELECTED_TAGS,
	UPDATE_SPANS_AGGREEGATE,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

const initialValue: TraceReducer = {
	filter: new Map(),
	filterToFetchData: ['duration', 'status', 'serviceName'],
	filterLoading: false,
	selectedFilter: new Map(),
	selectedTags: [],
	isTagModalOpen: false,
	spansAggregate: {
		currentPage: 1,
		loading: false,
		data: [],
		error: false,
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
			const { filter, filterToFetchData, selectedFilter } = payload;

			return {
				...state,
				filter,
				filterToFetchData,
				selectedFilter,
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

		default:
			return state;
	}
};

export default traceReducer;

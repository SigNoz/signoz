import {
	TraceActions,
	UPDATE_TRACE_FILTER,
	UPDATE_TRACE_FILTER_LOADING,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

const initialValue: TraceReducer = {
	filter: new Map(),
	filterToFetchData: ['duration', 'status', 'serviceName'],
	filterLoading: false,
	selectedFilter: new Map(),
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

		case UPDATE_TRACE_FILTER_LOADING: {
			return {
				...state,
				filterLoading: action.payload.filterLoading,
			};
		}

		default:
			return state;
	}
};

export default traceReducer;

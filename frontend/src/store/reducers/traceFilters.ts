import { TraceFilters } from 'store/actions/traceFilters';
import { ActionTypes } from 'store/actions/types';

type ACTION = {
	type: ActionTypes;
	payload: TraceFilters;
};

const initialState: TraceFilters = {
	service: '',
	tags: [],
	operation: '',
	latency: { min: '', max: '' },
	kind: '',
};

const TraceFilterReducer = (state = initialState, action: ACTION) => {
	switch (action.type) {
		case ActionTypes.updateTraceFilters:
			return action.payload;
		default:
			return state;
	}
};

export default TraceFilterReducer;

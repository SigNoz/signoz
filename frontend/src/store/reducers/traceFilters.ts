import { ActionTypes, TraceFilters } from '../actions';

type ACTION = {
	type: ActionTypes;
	payload: TraceFilters;
};
const initialState: TraceFilters = {
	service: '',
	tags: [],
	operation: '',
	latency: { min: '', max: '' },
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

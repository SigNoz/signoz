import {
	ActionTypes,
	Action,
	traceResponseNew,
	spanList,
	spansWSameTraceIDResponse,
} from '../actions';

// PNOTE - Initializing is a must for state variable otherwise it gives an error in reducer
const spanlistinstance: spanList = { events: [], segmentID: '', columns: [] };
export const tracesReducer = (
	state: traceResponseNew = { '0': spanlistinstance },
	action: Action,
) => {
	switch (action.type) {
	case ActionTypes.fetchTraces:
		return action.payload;
	default:
		return state;
	}
};

export const traceItemReducer = (
	state: spansWSameTraceIDResponse = { '0': spanlistinstance },
	action: Action,
) => {
	switch (action.type) {
	case ActionTypes.fetchTraceItem:
		return action.payload;
	default:
		return state;
	}
};

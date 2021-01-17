import {
	ActionTypes,
	TraceFilters,
	updateInputTagAction,
	updateTraceFiltersAction,
} from "../actions";

export const traceFiltersReducer = (
	state: TraceFilters = {
		service: "",
		tags: [],
		operation: "",
		latency: { min: "", max: "" },
	},
	action: updateTraceFiltersAction,
) => {
	switch (action.type) {
		case ActionTypes.updateTraceFilters:
			return action.payload;
		default:
			return state;
	}
};

export const inputsReducer = (
	state: string = "",
	action: updateInputTagAction,
) => {
	switch (action.type) {
		case ActionTypes.updateInput:
			return action.payload;
		default:
			return state;
	}
};

import { ActionTypes, Action, GlobalTime } from '../actions';

export const updateGlobalTimeReducer = (
	state: GlobalTime = {
		maxTime: Date.now() * 1000000,
		minTime: (Date.now() - 15 * 60 * 1000) * 1000000,
	},
	action: Action,
) => {
	// Initial global state is time now and 15 minute interval
	switch (action.type) {
	case ActionTypes.updateTimeInterval:
		return action.payload;
	default:
		return state;
	}
};

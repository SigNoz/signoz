import { ActionTypes, Action, usageDataItem } from '../actions';

export const usageDataReducer = (
	state: usageDataItem[] = [{ timestamp: 0, count: 0 }],
	action: Action,
) => {
	switch (action.type) {
	case ActionTypes.getUsageData:
		return action.payload;
	default:
		return state;
	}
};

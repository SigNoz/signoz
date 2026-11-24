/* eslint-disable sonarjs/no-small-switch */
import type { Action, UsageDataItem } from 'store/actions';
import { ActionTypes } from 'store/actions';

export const usageDataReducer = (
	state: UsageDataItem[] = [{ timestamp: 0, count: 0 }],
	action: Action,
): UsageDataItem[] => {
	switch (action.type) {
		case ActionTypes.getUsageData:
			return action.payload;
		default:
			return state;
	}
};

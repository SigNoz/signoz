/* eslint-disable sonarjs/no-small-switch */
import { Action, ActionTypes } from 'store/actions/types';
import type { UsageDataItem } from 'store/actions/usage';

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

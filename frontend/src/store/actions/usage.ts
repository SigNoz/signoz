import api from 'api';
import { Dispatch } from 'redux';
import { toUTCEpoch } from 'utils/timeUtils';

import { ActionTypes } from './types';

export interface UsageDataItem {
	timestamp: number;
	count: number;
}

export interface GetUsageDataAction {
	type: ActionTypes.getUsageData;
	payload: UsageDataItem[];
}

export const getUsageData = (
	minTime: number,
	maxTime: number,
	step: number,
	service: string,
) => async (dispatch: Dispatch): Promise<void> => {
	const requesString = `/usage?start=${toUTCEpoch(minTime)}&end=${toUTCEpoch(
		maxTime,
	)}&step=${step}&service=${service || ''}`;
	// Step can only be multiple of 3600
	const response = await api.get<UsageDataItem[]>(requesString);

	dispatch<GetUsageDataAction>({
		type: ActionTypes.getUsageData,
		payload: response.data,
		// PNOTE - response.data in the axios response has the actual API response
	});
};

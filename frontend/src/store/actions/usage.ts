import { Dispatch } from 'redux';
import api, { apiV1 } from '../../api';

import { ActionTypes } from './types';
import { toUTCEpoch } from '../../utils/timeUtils';

export interface usageDataItem {
	timestamp: number;
	count: number;
}

export interface getUsageDataAction {
	type: ActionTypes.getUsageData;
	payload: usageDataItem[];
}

export const getUsageData = (
	minTime: number,
	maxTime: number,
	step: number,
	service: string,
) => {
	return async (dispatch: Dispatch) => {
		const request_string = `/usage?start=${toUTCEpoch(minTime)}&end=${toUTCEpoch(
			maxTime,
		)}&step=${step}&service=${service ? service : ''}`;
		//Step can only be multiple of 3600
		const response = await api.get<usageDataItem[]>(apiV1 + request_string);

		dispatch<getUsageDataAction>({
			type: ActionTypes.getUsageData,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

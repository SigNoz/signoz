import { Dispatch } from "redux";
import metricsAPI from "../api/metricsAPI";
import { ActionTypes } from "./types";
import { GlobalTime } from "./global";

export interface usageDataItem {
	timestamp: number;
	count: number;
}

export interface getUsageDataAction {
	type: ActionTypes.getUsageData;
	payload: usageDataItem[];
}

export const getUsageData = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"usage?start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime +
			"&step=3600&service=driver";
		//Step can only be multiple of 3600
		const response = await metricsAPI.get<usageDataItem[]>(request_string);

		dispatch<getUsageDataAction>({
			type: ActionTypes.getUsageData,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

import { Dispatch } from "redux";
import api, { apiV1 } from "../../api";
import { GlobalTime } from "./global";
import { ActionTypes } from "./types";

export interface serviceMapStore {
	items: servicesMapItem[];
	services: servicesItem[];
}

export interface servicesItem {
	serviceName: string;
	p99: number;
	avgDuration: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
	num4XX: number;
	fourXXRate: number;
}

export interface servicesMapItem {
	parent: string;
	child: string;
	callCount: number;
}

export interface serviceMapItemAction {
	type: ActionTypes.getServiceMapItems;
	payload: servicesMapItem[];
}

export interface servicesAction {
	type: ActionTypes.getServices;
	payload: servicesItem[];
}

export const getServiceMapItems = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/serviceMapDependencies?start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime;

		const response = await api.get<servicesMapItem[]>(apiV1 + request_string);
		// const response = {
		// 	data: [
		// 		{
		// 			parent: "driver",
		// 			child: "redis",
		// 			callCount: 17050,
		// 		},
		// 		{
		// 			parent: "frontend",
		// 			child: "driver",
		// 			callCount: 1263,
		// 		},
		// 		{
		// 			parent: "customer",
		// 			child: "mysql",
		// 			callCount: 1262,
		// 		},
		// 		{
		// 			parent: "frontend",
		// 			child: "customer",
		// 			callCount: 1262,
		// 		},
		// 		{
		// 			parent: "frontend",
		// 			child: "route",
		// 			callCount: 12636,
		// 		},
		// 	],
		// };
		dispatch<serviceMapItemAction>({
			type: ActionTypes.getServiceMapItems,
			payload: response.data,
		});
	};
};

export const getDetailedServiceMapItems = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/services?start=" + globalTime.minTime + "&end=" + globalTime.maxTime;

		const response = await api.get<servicesItem[]>(apiV1 + request_string);
		// const response = {
		// 	data: [
		// 		{
		// 			serviceName: "redis",
		// 			p99: 1179518000,
		// 			avgDuration: 742158850,
		// 			numCalls: 1898,
		// 			callRate: 0.019097411,
		// 			numErrors: 0,
		// 			errorRate: 3,
		// 			num4XX: 0,
		// 			fourXXRate: 0,
		// 		},
		// 		{
		// 			serviceName: "mysql",
		// 			p99: 1179518000,
		// 			avgDuration: 742158850,
		// 			numCalls: 1898,
		// 			callRate: 0.019097411,
		// 			numErrors: 0,
		// 			errorRate: 0,
		// 			num4XX: 0,
		// 			fourXXRate: 0,
		// 		},
		// 		{
		// 			serviceName: "frontend",
		// 			p99: 1179518000,
		// 			avgDuration: 742158850,
		// 			numCalls: 1898,
		// 			callRate: 0.000019097411,
		// 			numErrors: 0,
		// 			errorRate: 0,
		// 			num4XX: 0,
		// 			fourXXRate: 0,
		// 		},
		// 		{
		// 			serviceName: "customer",
		// 			p99: 728385000,
		// 			avgDuration: 342475680,
		// 			numCalls: 1897,
		// 			callRate: 0.000019087349,
		// 			numErrors: 0,
		// 			errorRate: 0,
		// 			num4XX: 0,
		// 			fourXXRate: 0.6325778,
		// 		},
		// 		{
		// 			serviceName: "driver",
		// 			p99: 243808000,
		// 			avgDuration: 204640670,
		// 			numCalls: 1898,
		// 			callRate: 0.000019097411,
		// 			numErrors: 0,
		// 			errorRate: 0,
		// 			num4XX: 0,
		// 			fourXXRate: 0.63224447,
		// 		},
		// 		{
		// 			serviceName: "route",
		// 			p99: 79419000,
		// 			avgDuration: 50748804,
		// 			numCalls: 18979,
		// 			callRate: 0.00019096404,
		// 			numErrors: 0,
		// 			errorRate: 3,
		// 			num4XX: 0,
		// 			fourXXRate: 0,
		// 		},
		// 	],
		// };
		dispatch<servicesAction>({
			type: ActionTypes.getServices,
			payload: response.data,
		});
	};
};

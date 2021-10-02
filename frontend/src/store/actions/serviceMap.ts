import api from 'api';
import { Dispatch } from 'redux';
import { GlobalTime } from 'types/actions/globalTime';

import { ActionTypes } from './types';

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
		dispatch<serviceMapItemAction>({
			type: ActionTypes.getServiceMapItems,
			payload: [],
		});

		const request_string =
			'/serviceMapDependencies?start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime;

		const response = await api.get<servicesMapItem[]>(request_string);

		dispatch<serviceMapItemAction>({
			type: ActionTypes.getServiceMapItems,
			payload: response.data,
		});
	};
};

export const getDetailedServiceMapItems = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch) => {
		dispatch<servicesAction>({
			type: ActionTypes.getServices,
			payload: [],
		});

		const request_string =
			'/services?start=' + globalTime.minTime + '&end=' + globalTime.maxTime;

		const response = await api.get<servicesItem[]>(request_string);

		dispatch<servicesAction>({
			type: ActionTypes.getServices,
			payload: response.data,
		});
	};
};

import api from 'api';
import { Dispatch } from 'redux';
import { GlobalTime } from 'types/actions/globalTime';

import { ActionTypes } from './types';

export interface ServiceMapStore {
	items: ServicesMapItem[];
	services: ServicesItem[];
}

export interface ServicesItem {
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

export interface ServicesMapItem {
	parent: string;
	child: string;
	callCount: number;
}

export interface ServiceMapItemAction {
	type: ActionTypes.getServiceMapItems;
	payload: ServicesMapItem[];
}

export interface ServicesAction {
	type: ActionTypes.getServices;
	payload: ServicesItem[];
}

export const getServiceMapItems = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch): Promise<void> => {
		dispatch<ServiceMapItemAction>({
			type: ActionTypes.getServiceMapItems,
			payload: [],
		});

		const requestString = `/serviceMapDependencies?start=${globalTime.minTime}&end=${globalTime.maxTime}`;

		const response = await api.get<ServicesMapItem[]>(requestString);

		dispatch<ServiceMapItemAction>({
			type: ActionTypes.getServiceMapItems,
			payload: response.data,
		});
	};
};

export const getDetailedServiceMapItems = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch): Promise<void> => {
		dispatch<ServicesAction>({
			type: ActionTypes.getServices,
			payload: [],
		});

		const requestString = `/services?start=${globalTime.minTime}&end=${globalTime.maxTime}`;

		const response = await api.get<ServicesItem[]>(requestString);

		dispatch<ServicesAction>({
			type: ActionTypes.getServices,
			payload: response.data,
		});
	};
};

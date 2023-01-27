import api from 'api';
import { Dispatch } from 'redux';
import { GlobalTime } from 'types/actions/globalTime';

import { ActionTypes } from './types';

export interface ServiceMapStore {
	items: ServicesMapItem[];
	loading: boolean;
}

export interface ServicesMapItem {
	parent: string;
	child: string;
	callCount: number;
	callRate: number;
	errorRate: number;
	p99: number;
}

export interface ServiceMapItemAction {
	type: ActionTypes.getServiceMapItems;
	payload: ServicesMapItem[];
}

export interface ServiceMapLoading {
	type: ActionTypes.serviceMapLoading;
	payload: {
		loading: ServiceMapStore['loading'];
	};
}

export const getDetailedServiceMapItems = (globalTime: GlobalTime) => async (
	dispatch: Dispatch,
): Promise<void> => {
	const start = `${globalTime.minTime}`;
	const end = `${globalTime.maxTime}`;

	const serviceMapPayload = {
		start,
		end,
		tags: [],
	};
	const [dependencyGraphResponse] = await Promise.all([
		api.post<ServicesMapItem[]>(`/dependency_graph`, serviceMapPayload),
	]);

	dispatch<ServiceMapItemAction>({
		type: ActionTypes.getServiceMapItems,
		payload: dependencyGraphResponse.data,
	});

	dispatch<ServiceMapLoading>({
		type: ActionTypes.serviceMapLoading,
		payload: {
			loading: false,
		},
	});
};

import { ServiceMapItemAction, ServiceMapLoading } from './serviceMap';

export enum ActionTypes {
	updateTimeInterval = 'UPDATE_TIME_INTERVAL',
	getServiceMapItems = 'GET_SERVICE_MAP_ITEMS',
	getServices = 'GET_SERVICES',
	fetchTraces = 'FETCH_TRACES',
	fetchTraceItem = 'FETCH_TRACE_ITEM',
	serviceMapLoading = 'UPDATE_SERVICE_MAP_LOADING',
}

export type Action =
	| ServiceMapItemAction
	| ServiceMapLoading;

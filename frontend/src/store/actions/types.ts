import { ServiceMapItemAction, ServiceMapLoading } from './serviceMap';
import { GetUsageDataAction } from './usage';

export enum ActionTypes {
	updateTimeInterval = 'UPDATE_TIME_INTERVAL',
	getServiceMapItems = 'GET_SERVICE_MAP_ITEMS',
	getServices = 'GET_SERVICES',
	getUsageData = 'GET_USAGE_DATE',
	fetchTraces = 'FETCH_TRACES',
	fetchTraceItem = 'FETCH_TRACE_ITEM',
	serviceMapLoading = 'UPDATE_SERVICE_MAP_LOADING',
}

export type Action =
	| GetUsageDataAction
	| ServiceMapItemAction
	| ServiceMapLoading;

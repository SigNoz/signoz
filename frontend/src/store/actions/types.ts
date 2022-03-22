import { ServiceMapItemAction, ServicesAction } from './serviceMap';
import { GetUsageDataAction } from './usage';

export enum ActionTypes {
	updateTraceFilters = 'UPDATE_TRACES_FILTER',
	updateTimeInterval = 'UPDATE_TIME_INTERVAL',
	getServiceMapItems = 'GET_SERVICE_MAP_ITEMS',
	getServices = 'GET_SERVICES',
	getUsageData = 'GET_USAGE_DATE',
	fetchTraces = 'FETCH_TRACES',
	fetchTraceItem = 'FETCH_TRACE_ITEM',
}

export type Action = GetUsageDataAction | ServicesAction | ServiceMapItemAction;

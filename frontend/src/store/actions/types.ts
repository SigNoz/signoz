import { FetchTracesAction, FetchTraceItemAction } from "./traces";
import { updateTraceFiltersAction, updateInputTagAction } from "./traceFilters";

import { serviceMapItemAction, servicesAction } from "./serviceMap";
import { getUsageDataAction } from "./usage";
import { updateTimeIntervalAction } from "./global";

export enum ActionTypes {
	updateTraceFilters = "UPDATE_TRACES_FILTER",
	updateTimeInterval = "UPDATE_TIME_INTERVAL",
	getServiceMapItems = "GET_SERVICE_MAP_ITEMS",
	getServices = "GET_SERVICES",
	getUsageData = "GET_USAGE_DATE",
}

export type Action =
	| FetchTraceItemAction
	| FetchTracesAction
	| updateTraceFiltersAction
	| updateInputTagAction
	| getUsageDataAction
	| updateTimeIntervalAction
	| servicesAction
	| serviceMapItemAction;

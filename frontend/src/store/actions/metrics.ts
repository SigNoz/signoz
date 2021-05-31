import { Dispatch } from "redux";
import api, { apiV1 } from "../../api";

import { GlobalTime } from "./global";
import { ActionTypes } from "./types";
import { Token } from "../../utils/token";
import { toUTCEpoch } from "../../utils/timeUtils";

export interface servicesListItem {
	serviceName: string;
	p99: number;
	avgDuration: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
}

export interface metricItem {
	timestamp: number;
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	callRate: number;
	numErrors: number;
	errorRate: number;
}

export interface externalMetricsAvgDurationItem {
	avgDuration: number;
	timestamp: number;
}

export interface externalErrCodeMetricsItem {
	errorRate: number;
	externalHttpUrl: string;
	numErrors: number;
	timestamp: number;
}
export interface topEndpointListItem {
	p50: number;
	p95: number;
	p99: number;
	numCalls: number;
	name: string;
}

export interface externalMetricsItem {
	avgDuration: number;
	callRate: number;
	externalHttpUrl: string;
	numCalls: number;
	timestamp: number;
}

export interface dbOverviewMetricsItem {
	avgDuration: number;
	callRate: number;
	dbSystem: string;
	numCalls: number;
	timestamp: number;
}

export interface customMetricsItem {
	timestamp: number;
	value: number;
}

export interface getServicesListAction {
	type: ActionTypes.getServicesList;
	payload: servicesListItem[];
}

export interface externalErrCodeMetricsActions {
	type: ActionTypes.getErrCodeMetrics;
	payload: externalErrCodeMetricsItem[];
}
export interface externalMetricsAvgDurationAction {
	type: ActionTypes.getAvgDurationMetrics;
	payload: externalMetricsAvgDurationItem[];
}
export interface getServiceMetricsAction {
	type: ActionTypes.getServiceMetrics;
	payload: metricItem[];
}
export interface getExternalMetricsAction {
	type: ActionTypes.getExternalMetrics;
	payload: externalMetricsItem[];
}

export interface getDbOverViewMetricsAction {
	type: ActionTypes.getDbOverviewMetrics;
	payload: dbOverviewMetricsItem[];
}
export interface getTopEndpointsAction {
	type: ActionTypes.getTopEndpoints;
	payload: topEndpointListItem[];
}

export interface getFilteredTraceMetricsAction {
	type: ActionTypes.getFilteredTraceMetrics;
	payload: customMetricsItem[];
}

export const getServicesList = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/services?start=" + globalTime.minTime + "&end=" + globalTime.maxTime;

		const response = await api.get<servicesListItem[]>(apiV1 + request_string);

		dispatch<getServicesListAction>({
			type: ActionTypes.getServicesList,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

export const getDbOverViewMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/service/dbOverview?service=" +
			serviceName +
			"&start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime +
			"&step=60";
		const response = await api.get<dbOverviewMetricsItem[]>(
			apiV1 + request_string,
		);
		dispatch<getDbOverViewMetricsAction>({
			type: ActionTypes.getDbOverviewMetrics,
			payload: response.data,
		});
	};
};

export const getExternalMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/service/external?service=" +
			serviceName +
			"&start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime +
			"&step=60";
		const response = await api.get<externalMetricsItem[]>(apiV1 + request_string);
		dispatch<getExternalMetricsAction>({
			type: ActionTypes.getExternalMetrics,
			payload: response.data,
		});
	};
};

export const getExternalAvgDurationMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/service/externalAvgDuration?service=" +
			serviceName +
			"&start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime +
			"&step=60";

		const response = await api.get<externalMetricsAvgDurationItem[]>(
			apiV1 + request_string,
		);
		dispatch<externalMetricsAvgDurationAction>({
			type: ActionTypes.getAvgDurationMetrics,
			payload: response.data,
		});
	};
};
export const getExternalErrCodeMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/service/externalErrors?service=" +
			serviceName +
			"&start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime +
			"&step=60";
		const response = await api.get<externalErrCodeMetricsItem[]>(
			apiV1 + request_string,
		);

		dispatch<externalErrCodeMetricsActions>({
			type: ActionTypes.getErrCodeMetrics,
			payload: response.data,
		});
	};
};

export const getServicesMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/service/overview?service=" +
			serviceName +
			"&start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime +
			"&step=60";
		const response = await api.get<metricItem[]>(apiV1 + request_string);

		dispatch<getServiceMetricsAction>({
			type: ActionTypes.getServiceMetrics,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

export const getTopEndpoints = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/service/top_endpoints?service=" +
			serviceName +
			"&start=" +
			globalTime.minTime +
			"&end=" +
			globalTime.maxTime;
		const response = await api.get<topEndpointListItem[]>(apiV1 + request_string);

		dispatch<getTopEndpointsAction>({
			type: ActionTypes.getTopEndpoints,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

export const getFilteredTraceMetrics = (
	filter_params: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		let request_string =
			"/spans/aggregates?start=" +
			toUTCEpoch(globalTime.minTime) +
			"&end=" +
			toUTCEpoch(globalTime.maxTime) +
			"&" +
			filter_params;
		const response = await api.get<customMetricsItem[]>(apiV1 + request_string);

		dispatch<getFilteredTraceMetricsAction>({
			type: ActionTypes.getFilteredTraceMetrics,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

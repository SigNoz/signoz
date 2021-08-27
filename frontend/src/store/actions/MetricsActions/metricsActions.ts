import api, { apiV1 } from 'api';
import { Dispatch } from 'redux';
import { GlobalTime } from 'store/actions/global';
import { toUTCEpoch } from 'utils/timeUtils';

import { MetricsActionTypes } from './metricsActionTypes';
import * as MetricsInterfaces from './metricsInterfaces';

export const getServicesList = (globalTime: GlobalTime) => {
	return async (dispatch: Dispatch) => {
		const request_string =
			'/services?start=' + globalTime.minTime + '&end=' + globalTime.maxTime;

		const response = await api.get<MetricsInterfaces.servicesListItem[]>(
			apiV1 + request_string,
		);

		dispatch<MetricsInterfaces.getServicesListAction>({
			type: MetricsActionTypes.getServicesList,
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
		const request_string =
			'/service/dbOverview?service=' +
			serviceName +
			'&start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime +
			'&step=60';
		const response = await api.get<MetricsInterfaces.dbOverviewMetricsItem[]>(
			apiV1 + request_string,
		);
		dispatch<MetricsInterfaces.getDbOverViewMetricsAction>({
			type: MetricsActionTypes.getDbOverviewMetrics,
			payload: response.data,
		});
	};
};

export const getExternalMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		const request_string =
<<<<<<< HEAD
			"/service/external?service=" +
=======
			'/service/external?service=' +
>>>>>>> main
			serviceName +
			'&start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime +
			'&step=60';
		const response = await api.get<MetricsInterfaces.externalMetricsItem[]>(
			apiV1 + request_string,
		);
		dispatch<MetricsInterfaces.getExternalMetricsAction>({
			type: MetricsActionTypes.getExternalMetrics,
			payload: response.data,
		});
	};
};

export const getExternalAvgDurationMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		const request_string =
<<<<<<< HEAD
			"/service/externalAvgDuration?service=" +
=======
			'/service/externalAvgDuration?service=' +
>>>>>>> main
			serviceName +
			'&start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime +
			'&step=60';

		const response = await api.get<
			MetricsInterfaces.externalMetricsAvgDurationItem[]
		>(apiV1 + request_string);
		dispatch<MetricsInterfaces.externalMetricsAvgDurationAction>({
			type: MetricsActionTypes.getAvgDurationMetrics,
			payload: response.data,
		});
	};
};
export const getExternalErrCodeMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		const request_string =
<<<<<<< HEAD
			"/service/externalErrors?service=" +
=======
			'/service/externalErrors?service=' +
>>>>>>> main
			serviceName +
			'&start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime +
			'&step=60';
		const response = await api.get<
			MetricsInterfaces.externalErrCodeMetricsItem[]
		>(apiV1 + request_string);

		dispatch<MetricsInterfaces.externalErrCodeMetricsActions>({
			type: MetricsActionTypes.getErrCodeMetrics,
			payload: response.data,
		});
	};
};

export const getServicesMetrics = (
	serviceName: string,
	globalTime: GlobalTime,
) => {
	return async (dispatch: Dispatch) => {
		const request_string =
<<<<<<< HEAD
			"/service/overview?service=" +
=======
			'/service/overview?service=' +
>>>>>>> main
			serviceName +
			'&start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime +
			'&step=60';
		const response = await api.get<MetricsInterfaces.metricItem[]>(
			apiV1 + request_string,
		);

		dispatch<MetricsInterfaces.getServiceMetricsAction>({
			type: MetricsActionTypes.getServiceMetrics,
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
		const request_string =
<<<<<<< HEAD
			"/service/top_endpoints?service=" +
=======
			'/service/top_endpoints?service=' +
>>>>>>> main
			serviceName +
			'&start=' +
			globalTime.minTime +
			'&end=' +
			globalTime.maxTime;
		const response = await api.get<MetricsInterfaces.topEndpointListItem[]>(
			apiV1 + request_string,
		);

		dispatch<MetricsInterfaces.getTopEndpointsAction>({
			type: MetricsActionTypes.getTopEndpoints,
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
		const request_string =
<<<<<<< HEAD
			"/spans/aggregates?start=" +
=======
			'/spans/aggregates?start=' +
>>>>>>> main
			toUTCEpoch(globalTime.minTime) +
			'&end=' +
			toUTCEpoch(globalTime.maxTime) +
			'&' +
			filter_params;
		const response = await api.get<MetricsInterfaces.customMetricsItem[]>(
			apiV1 + request_string,
		);

		dispatch<MetricsInterfaces.getFilteredTraceMetricsAction>({
			type: MetricsActionTypes.getFilteredTraceMetrics,
			payload: response.data,
			//PNOTE - response.data in the axios response has the actual API response
		});
	};
};

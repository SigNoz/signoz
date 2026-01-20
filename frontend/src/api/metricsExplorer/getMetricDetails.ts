import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { MetricType } from './getMetricsList';

export interface MetricDetails {
	name: string;
	description: string;
	type: string;
	unit: string;
	timeseries: number;
	samples: number;
	timeSeriesTotal: number;
	timeSeriesActive: number;
	lastReceived: string;
	attributes: MetricDetailsAttribute[] | null;
	metadata?: {
		metric_type: MetricType;
		description: string;
		unit: string;
		temporality?: Temporality;
	};
	alerts: MetricDetailsAlert[] | null;
	dashboards: MetricDetailsDashboard[] | null;
}

export enum Temporality {
	CUMULATIVE = 'Cumulative',
	DELTA = 'Delta',
}

export interface MetricDetailsAttribute {
	key: string;
	value: string[];
	valueCount: number;
}

export interface MetricDetailsAlert {
	alert_name: string;
	alert_id: string;
}

export interface MetricDetailsDashboard {
	dashboard_name: string;
	dashboard_id: string;
}

export interface MetricDetailsResponse {
	status: string;
	data: MetricDetails;
}

export const getMetricDetails = async (
	metricName: string,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<MetricDetailsResponse> | ErrorResponse> => {
	try {
		const response = await axios.get(`/metrics/${metricName}/metadata`, {
			signal,
			headers,
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

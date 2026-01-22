import { SuccessResponseV2 } from 'types/api';
import {
	GetMetricAlertsResponse,
	GetMetricAttributesResponse,
	GetMetricDashboardsResponse,
	GetMetricHighlightsResponse,
	GetMetricMetadataResponse,
} from 'types/api/metricsExplorer/v2';
import { Temporality } from 'types/common/queryBuilder';

export function getMockMetricHighlightsData(
	overrides?: Partial<GetMetricHighlightsResponse>,
): SuccessResponseV2<GetMetricHighlightsResponse> {
	return {
		httpStatusCode: 200,
		data: {
			data: {
				dataPoints: 1000000,
				lastReceived: 1716393600,
				totalTimeSeries: 1000000,
				activeTimeSeries: 1000000,
				...overrides,
			},
			status: 'success',
		},
	};
}

export const MOCK_DASHBOARD_1 = {
	dashboardName: 'Dashboard 1',
	dashboardId: '1',
	widgetId: '1',
	widgetName: 'Widget 1',
};
export const MOCK_DASHBOARD_2 = {
	dashboardName: 'Dashboard 2',
	dashboardId: '2',
	widgetId: '2',
	widgetName: 'Widget 2',
};
export const MOCK_ALERT_1 = {
	alertName: 'Alert 1',
	alertId: '1',
};
export const MOCK_ALERT_2 = {
	alertName: 'Alert 2',
	alertId: '2',
};

export function getMockDashboardsData(
	overrides?: Partial<GetMetricDashboardsResponse>,
): SuccessResponseV2<GetMetricDashboardsResponse> {
	return {
		httpStatusCode: 200,
		data: {
			data: {
				dashboards: [MOCK_DASHBOARD_1, MOCK_DASHBOARD_2],
			},
			status: 'success',
			...overrides,
		},
	};
}

export function getMockAlertsData(
	overrides?: Partial<GetMetricAlertsResponse>,
): SuccessResponseV2<GetMetricAlertsResponse> {
	return {
		httpStatusCode: 200,
		data: {
			data: {
				alerts: [MOCK_ALERT_1, MOCK_ALERT_2],
			},
			status: 'success',
			...overrides,
		},
	};
}

export function getMockMetricAttributesData(
	overrides?: Partial<GetMetricAttributesResponse>,
): SuccessResponseV2<GetMetricAttributesResponse> {
	return {
		httpStatusCode: 200,
		data: {
			data: {
				attributes: [
					{
						key: 'attribute1',
						values: ['value1', 'value2'],
						valueCount: 2,
					},
					{
						key: 'attribute2',
						values: ['value3'],
						valueCount: 1,
					},
				],
				totalKeys: 2,
			},
			status: 'success',
			...overrides,
		},
	};
}

export function getMockMetricMetadataData(
	overrides?: Partial<GetMetricMetadataResponse>,
): SuccessResponseV2<GetMetricMetadataResponse> {
	return {
		httpStatusCode: 200,
		data: {
			data: {
				description: 'test_description',
				type: 'gauge',
				unit: 'test_unit',
				temporality: Temporality.Delta,
				isMonotonic: false,
			},
			status: 'success',
			...overrides,
		},
	};
}

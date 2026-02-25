import * as metricsExplorerHooks from 'api/generated/services/metrics';
import {
	GetMetricAlerts200,
	GetMetricAttributes200,
	GetMetricDashboards200,
	GetMetricHighlights200,
	GetMetricMetadata200,
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

export const MOCK_METRIC_NAME = 'test-metric';

export function getMockMetricHighlightsData(
	overrides?: Partial<GetMetricHighlights200>,
	{
		isLoading = false,
		isError = false,
	}: {
		isLoading?: boolean;
		isError?: boolean;
	} = {},
): ReturnType<typeof metricsExplorerHooks.useGetMetricHighlights> {
	return {
		data: {
			data: {
				dataPoints: 1000000,
				lastReceived: '2026-01-24T00:00:00Z',
				totalTimeSeries: 1000000,
				activeTimeSeries: 1000000,
			},
			status: 'success',
			...overrides,
		},
		isLoading,
		isError,
	} as ReturnType<typeof metricsExplorerHooks.useGetMetricHighlights>;
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
	overrides?: Partial<GetMetricDashboards200>,
	{
		isLoading = false,
		isError = false,
	}: {
		isLoading?: boolean;
		isError?: boolean;
	} = {},
): ReturnType<typeof metricsExplorerHooks.useGetMetricDashboards> {
	return {
		data: {
			data: {
				dashboards: [MOCK_DASHBOARD_1, MOCK_DASHBOARD_2],
			},
			status: 'success',
			...overrides,
		},

		isLoading,
		isError,
	} as ReturnType<typeof metricsExplorerHooks.useGetMetricDashboards>;
}

export function getMockAlertsData(
	overrides?: Partial<GetMetricAlerts200>,
	{
		isLoading = false,
		isError = false,
	}: {
		isLoading?: boolean;
		isError?: boolean;
	} = {},
): ReturnType<typeof metricsExplorerHooks.useGetMetricAlerts> {
	return {
		data: {
			data: {
				alerts: [MOCK_ALERT_1, MOCK_ALERT_2],
			},
			status: 'success',
			...overrides,
		},
		isLoading,
		isError,
	} as ReturnType<typeof metricsExplorerHooks.useGetMetricAlerts>;
}

export function getMockMetricAttributesData(
	overrides?: Partial<GetMetricAttributes200>,
	{
		isLoading = false,
		isError = false,
	}: {
		isLoading?: boolean;
		isError?: boolean;
	} = {},
): ReturnType<typeof metricsExplorerHooks.useGetMetricAttributes> {
	return {
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
		isLoading,
		isError,
	} as ReturnType<typeof metricsExplorerHooks.useGetMetricAttributes>;
}

export function getMockMetricMetadataData(
	overrides?: Partial<GetMetricMetadata200>,
	{
		isLoading = false,
		isError = false,
	}: {
		isLoading?: boolean;
		isError?: boolean;
	} = {},
): ReturnType<typeof metricsExplorerHooks.useGetMetricMetadata> {
	return {
		data: {
			data: {
				description: 'test_description',
				type: MetrictypesTypeDTO.gauge,
				unit: 'test_unit',
				temporality: MetrictypesTemporalityDTO.delta,
				isMonotonic: false,
			},
			status: 'success',
			...overrides,
		},
		isLoading,
		isError,
	} as ReturnType<typeof metricsExplorerHooks.useGetMetricMetadata>;
}

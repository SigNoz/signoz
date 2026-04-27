// File: frontend/src/container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover.tsx
import { Dropdown, Menu, Skeleton, Typography } from 'antd';
import { Bell, Grid } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { generatePath } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import {
	useGetMetricAlerts,
	useGetMetricDashboards,
} from 'api/generated/services/metrics';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { openInNewTab } from 'utils/navigation';
import { pluralize } from 'utils/pluralize';

import { DashboardsAndAlertsPopoverProps } from './types';

type Status = {
	data: any[];
	isLoading: boolean;
	isError: boolean;
	error?: any;
};

function getErrorStatus(isError: boolean, error: any): Status {
	if (isError) {
		return { data: [], isLoading: false, isError: true, error };
	}
	return { data: [], isLoading: false, isError: false };
}

function getLoadingStatus(isLoading: boolean): Status {
	if (isLoading) {
		return { data: [], isLoading, isError: false };
	}
	return { data: [], isLoading: false, isError: false };
}

function useMetricAlertsStatus(metricName: string): Status {
	const {
		data: newAlertsData,
		isLoading: newIsLoadingAlerts,
		isError: newIsErrorAlerts,
		error: newErrorAlerts,
	} = useGetMetricAlerts(
		{
			metricName,
		},
		{ query: { enabled: !!metricName } },
	);

	if (newIsErrorAlerts) {
		return getErrorStatus(newIsErrorAlerts, newErrorAlerts);
	}

	if (newIsLoadingAlerts) {
		return getLoadingStatus(newIsLoadingAlerts);
	}

	return { data: newAlertsData, isLoading: false, isError: false };
}

function useMetricDashboardsStatus(metricName: string): Status {
	const {
		data: newDashboardsData,
		isLoading: newIsLoadingDashboards,
		isError: newIsErrorDashboards,
		error: newErrorDashboards,
	} = useGetMetricDashboards(
		{
			metricName,
		},
		{ query: { enabled: !!metricName } },
	);

	if (newIsErrorDashboards) {
		return getErrorStatus(newIsErrorDashboards, newErrorDashboards);
	}

	if (newIsLoadingDashboards) {
		return getLoadingStatus(newIsLoadingDashboards);
	}

	return { data: newDashboardsData, isLoading: false, isError: false };
}

function useMetricStatus(metricName: string): Status {
	return {
		alerts: useMetricAlertsStatus(metricName),
		dashboards: useMetricDashboardsStatus(metricName),
	};
}

function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const { alerts, dashboards } = useMetricStatus(metricName);

	if (alerts.isError || dashboards.isError) {
		return (
			<Skeleton active>
				<Typography.Text>Error loading data</Typography.Text>
			</Skeleton>
		);
	}

	if (alerts.isLoading || dashboards.isLoading) {
		return (
			<Skeleton active>
				<Typography.Text>Loading data...</Typography.Text>
			</Skeleton>
		);
	}

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item>
						<Typography.Text>
							{pluralize(alerts.data.length, 'alert')}{' '}
							{pluralize(dashboards.data.length, 'dashboard')}
						</Typography.Text>
					</Menu.Item>
					{alerts.data.map((alert) => (
						<Menu.Item key={alert.id}>
							<Typography.Text>
								<a
									href={generatePath(ROUTES.METRIC_ALERTS, {
										metricName,
										alertId: alert.id,
									})}
									onClick={(e) => {
										e.preventDefault();
										openInNewTab(generatePath(ROUTES.METRIC_ALERTS, {
											metricName,
											alertId: alert.id,
										}));
									}}
								>
									{alert.name}
								</a>
							</Typography.Text>
						</Menu.Item>
					))}
					{dashboards.data.map((dashboard) => (
						<Menu.Item key={dashboard.id}>
							<Typography.Text>
								<a
									href={generatePath(ROUTES.METRIC_DASHBOARD, {
										metricName,
										dashboardId: dashboard.id,
									})}
									onClick={(e) => {
										e.preventDefault();
										openInNewTab(generatePath(ROUTES.METRIC_DASHBOARD, {
											metricName,
											dashboardId: dashboard.id,
										}));
									}}
								>
									{dashboard.name}
								</a>
							</Typography.Text>
						</Menu.Item>
					))}
				</Menu>
			}
			trigger={['click']}
		>
			<Grid size={24} />
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
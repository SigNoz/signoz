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

function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element | null {
	const [alertsData, setAlertsData] = useState({
		data: [] as Array<unknown>,
		isLoading: false,
		isError: false,
	});
	const [dashboardsData, setDashboardsData] = useState({
		data: [] as Array<unknown>,
		isLoading: false,
		isError: false,
	});

	const {
		data: newAlertsData,
		isLoading: newIsLoadingAlerts,
		isError: newIsErrorAlerts,
	} = useGetMetricAlerts(
		{
			metricName,
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const {
		data: newDashboardsData,
		isLoading: newIsLoadingDashboards,
		isError: newIsErrorDashboards,
	} = useGetMetricDashboards(
		{
			metricName,
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	useEffect(() => {
		if (newAlertsData) {
			setAlertsData({
				data: newAlertsData.data?.alerts || [],
				isLoading: newIsLoadingAlerts,
				isError: newIsErrorAlerts,
			});
		}

		if (newDashboardsData) {
			setDashboardsData({
				data: newDashboardsData.data?.dashboards || [],
				isLoading: newIsLoadingDashboards,
				isError: newIsErrorDashboards,
			});
		}
	}, [
		newAlertsData,
		newDashboardsData,
		newIsLoadingAlerts,
		newIsLoadingDashboards,
		newIsErrorAlerts,
		newIsErrorDashboards,
	]);

	return (
		<Dropdown
			overlay={
				<Menu>
					{alertsData.data.length > 0 && (
						<Menu.Item
							key="alerts"
							onClick={() => openInNewTab(generatePath(ROUTES.METRIC_ALERTS, { metricName }))}
						>
							<Typography.Text>
								{pluralize(alertsData.data.length, 'alert', 'alerts')}{' '}
								<Grid size={16} />
							</Typography.Text>
						</Menu.Item>
					)}
					{dashboardsData.data.length > 0 && (
						<Menu.Item
							key="dashboards"
							onClick={() => openInNewTab(generatePath(ROUTES.METRIC_DASHBOARDS, { metricName }))}
						>
							<Typography.Text>
								{pluralize(dashboardsData.data.length, 'dashboard', 'dashboards')}{' '}
								<Grid size={16} />
							</Typography.Text>
						</Menu.Item>
					)}
				</Menu>
			}
		>
			<Typography.Text>
				<Grid size={16} />
				Alerts and Dashboards
			</Typography.Text>
		</Dropdown>
	);
}
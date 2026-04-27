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
		if (newIsErrorAlerts || newIsErrorDashboards) {
			setAlertsData({
				data: [],
				isLoading: false,
				isError: true,
			});
			setDashboardsData({
				data: [],
				isLoading: false,
				isError: true,
			});
		} else {
			setAlertsData({
				data: newAlertsData?.data?.alerts || [],
				isLoading: newIsLoadingAlerts,
				isError: newIsErrorAlerts,
			});
			setDashboardsData({
				data: newDashboardsData?.data?.dashboards || [],
				isLoading: newIsLoadingDashboards,
				isError: newIsErrorDashboards,
			});
		}
	}, [
		newAlertsData,
		newIsLoadingAlerts,
		newIsErrorAlerts,
		newDashboardsData,
		newIsLoadingDashboards,
		newIsErrorDashboards,
	]);

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item>
						<Typography.Text>
							{pluralize(alertsData.data.length, 'alert', 'alerts')}{' '}
							{newIsLoadingAlerts ? (
								<Skeleton active paragraph={false} />
							) : (
								<a
									href={generatePath(ROUTES.METRIC_ALERTS, {
										metricName,
									})}
									target="_blank"
									rel="noopener noreferrer"
								>
									{ROUTES.METRIC_ALERTS}
								</a>
							)}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item>
						<Typography.Text>
							{pluralize(dashboardsData.data.length, 'dashboard', 'dashboards')}{' '}
							{newIsLoadingDashboards ? (
								<Skeleton active paragraph={false} />
							) : (
								<a
									href={generatePath(ROUTES.METRIC_DASHBOARDS, {
										metricName,
									})}
									target="_blank"
									rel="noopener noreferrer"
								>
									{ROUTES.METRIC_DASHBOARDS}
								</a>
							)}
						</Typography.Text>
					</Menu.Item>
				</Menu>
			}
		>
			<Grid size={24} />
		</Dropdown>
	);
}
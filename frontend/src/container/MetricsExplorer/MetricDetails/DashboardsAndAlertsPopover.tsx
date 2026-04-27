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
	}, [newAlertsData, newIsLoadingAlerts, newIsErrorAlerts]);

	useEffect(() => {
		if (newDashboardsData) {
			setDashboardsData({
				data: newDashboardsData.data?.dashboards || [],
				isLoading: newIsLoadingDashboards,
				isError: newIsErrorDashboards,
			});
		}
	}, [newDashboardsData, newIsLoadingDashboards, newIsErrorDashboards]);

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item key="dashboards">
						<Typography.Text>
							{pluralize(dashboardsData.data.length, 'dashboard')}{' '}
							{dashboardsData.isLoading ? (
								<Skeleton active paragraph={false} />
							) : (
								<a
									href={generatePath(ROUTES.DASHBOARD_LIST, {
										metricName,
									})}
									target="_blank"
									onClick={(e) => {
										e.preventDefault();
										openInNewTab(generatePath(ROUTES.DASHBOARD_LIST, {
											metricName,
										}));
									}}
								>
									{dashboardsData.data.length > 0 ? (
										<Grid size={16} />
									) : (
										<Skeleton active paragraph={false} />
									)}
								</a>
							)}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item key="alerts">
						<Typography.Text>
							{pluralize(alertsData.data.length, 'alert')}{' '}
							{alertsData.isLoading ? (
								<Skeleton active paragraph={false} />
							) : (
								<a
									href={generatePath(ROUTES.ALERT_LIST, {
										metricName,
									})}
									target="_blank"
									onClick={(e) => {
										e.preventDefault();
										openInNewTab(generatePath(ROUTES.ALERT_LIST, {
											metricName,
										}));
									}}
								>
									{alertsData.data.length > 0 ? (
										<Bell size={16} />
									) : (
										<Skeleton active paragraph={false} />
									)}
								</a>
							)}
						</Typography.Text>
					</Menu.Item>
				</Menu>
			}
		>
			<Typography.Text>Alerts and Dashboards</Typography.Text>
		</Dropdown>
	);
}
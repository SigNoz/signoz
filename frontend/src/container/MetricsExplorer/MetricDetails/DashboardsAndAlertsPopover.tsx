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

function getErrorStatus(isError: boolean, error: any): { data: any[]; isLoading: boolean; isError: boolean } {
	if (isError) {
		return { data: [], isLoading: false, isError: true, error };
	}
	return { data: [], isLoading: false, isError: false };
}

function getLoadingStatus(isLoading: boolean): { data: any[]; isLoading: boolean; isError: boolean } {
	return { data: [], isLoading, isError: false };
}

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
		error: newErrorAlerts,
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
		error: newErrorDashboards,
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
		const alertsStatus = getErrorStatus(newIsErrorAlerts, newErrorAlerts);
		const dashboardsStatus = getErrorStatus(newIsErrorDashboards, newErrorDashboards);
		const alertsLoadingStatus = getLoadingStatus(newIsLoadingAlerts);
		const dashboardsLoadingStatus = getLoadingStatus(newIsLoadingDashboards);

		setAlertsData(alertsStatus);
		setDashboardsData(dashboardsStatus);
	}, [newIsErrorAlerts, newIsErrorDashboards, newIsLoadingAlerts, newIsLoadingDashboards, newErrorAlerts, newErrorDashboards]);

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item>
						<Typography.Text>
							{pluralize(alertsData.data.length, 'Alert')}{' '}
							{newIsLoadingAlerts ? (
								<Skeleton active paragraph={false} />
							) : (
								<a
									href={generatePath(ROUTES.METRIC_ALERTS, {
										metricName,
									})}
									onClick={(e) => {
										e.preventDefault();
										openInNewTab(generatePath(ROUTES.METRIC_ALERTS, {
											metricName,
										}));
									}}
								>
									{ROUTES.METRIC_ALERTS}
								</a>
							)}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item>
						<Typography.Text>
							{pluralize(dashboardsData.data.length, 'Dashboard')}{' '}
							{newIsLoadingDashboards ? (
								<Skeleton active paragraph={false} />
							) : (
								<a
									href={generatePath(ROUTES.METRIC_DASHBOARDS, {
										metricName,
									})}
									onClick={(e) => {
										e.preventDefault();
										openInNewTab(generatePath(ROUTES.METRIC_DASHBOARDS, {
											metricName,
										}));
									}}
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
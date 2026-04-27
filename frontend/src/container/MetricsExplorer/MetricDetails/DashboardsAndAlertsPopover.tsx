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
};

function getErrorStatus(isError: boolean, error: any): Status {
	if (isError) {
		return { data: [], isLoading: false, isError: true, error };
	}
	return { data: [], isLoading: false, isError: false };
}

function getLoadingStatus(isLoading: boolean): Status {
	return { data: [], isLoading, isError: false };
}

function useMetricAlertsStatus(
	metricName: string,
): Status {
	const {
		data: newAlertsData,
		isLoading: newIsLoadingAlerts,
		isError: newIsErrorAlerts,
		error: newErrorAlerts,
	} = useGetMetricAlerts(
		{
			metricName,
		},
	);

	return getErrorStatus(newIsErrorAlerts, newErrorAlerts) ||
		getLoadingStatus(newIsLoadingAlerts) ||
		{ data: [], isLoading: false, isError: false };
}

function useMetricDashboardsStatus(
	metricName: string,
): Status {
	const {
		data: newDashboardsData,
		isLoading: newIsLoadingDashboards,
		isError: newIsErrorDashboards,
		error: newErrorDashboards,
	} = useGetMetricDashboards(
		{
			metricName,
		},
	);

	return getErrorStatus(newIsErrorDashboards, newErrorDashboards) ||
		getLoadingStatus(newIsLoadingDashboards) ||
		{ data: [], isLoading: false, isError: false };
}

function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element | null {
	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const [alertsData, setAlertsData] = useState(alertsStatus.data);
	const [dashboardsData, setDashboardsData] = useState(dashboardsStatus.data);

	useEffect(() => {
		setAlertsData(alertsStatus.data);
		setDashboardsData(dashboardsStatus.data);
	}, [alertsStatus, dashboardsStatus]);

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item>
						<Typography.Text>
							{pluralize(alertsData.length, 'Alert')}{' '}
							{alertsStatus.isLoading ? (
								<Skeleton active paragraph={false} />
							) : (
								<Grid size={16} />
							)}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item>
						<Typography.Text>
							{pluralize(dashboardsData.length, 'Dashboard')}{' '}
							{dashboardsStatus.isLoading ? (
								<Skeleton active paragraph={false} />
							) : (
								<Grid size={16} />
							)}
						</Typography.Text>
					</Menu.Item>
				</Menu>
			}
		>
			<Dropdown.Trigger>
				<Typography.Text>
					Alerts and Dashboards
					{alertsStatus.isLoading || dashboardsStatus.isLoading ? (
						<Skeleton active paragraph={false} />
					) : (
						<Grid size={16} />
					)}
				</Typography.Text>
			</Dropdown.Trigger>
		</Dropdown>
	);
}
// File: frontend/src/container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover.tsx
import { Dropdown, Menu, Skeleton, Typography } from 'antd';
import { Bell, Grid } from 'lucide-react';
import { useMemo, useState } from 'react';
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

	useMemo(() => {
		setAlertsData({
			data: newAlertsData?.data?.alerts || [],
			isLoading: newIsLoadingAlerts,
			isError: newIsErrorAlerts,
		});
	}, [newAlertsData, newIsLoadingAlerts, newIsErrorAlerts]);

	useMemo(() => {
		setDashboardsData({
			data: newDashboardsData?.data?.dashboards || [],
			isLoading: newIsLoadingDashboards,
			isError: newIsErrorDashboards,
		});
	}, [newDashboardsData, newIsLoadingDashboards, newIsErrorDashboards]);

	const totalAlerts = alertsData.data.length;
	const totalDashboards = dashboardsData.data.length;

	const hasAnyData = totalAlerts > 0 || totalDashboards > 0;

	if (!hasAnyData && !alertsData.isLoading && !dashboardsData.isLoading) {
		return null;
	}

	const handleAlertClick = (): void => {
		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		});

		openInNewTab(`${ROUTES.ALERTS}?${searchParams.toString()}`);
	};

	const handleDashboardClick = (): void => {
		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		});

		openInNewTab(`${ROUTES.DASHBOARDS}?${searchParams.toString()}`);
	};

	const menu = (
		<Menu>
			{totalAlerts > 0 && (
				<Menu.Item key="alerts" icon={<Bell size={16} />} onClick={handleAlertClick}>
					<Typography.Text strong>{totalAlerts}</Typography.Text>{' '}
					{pluralize('alert', totalAlerts)} using this metric
				</Menu.Item>
			)}
			{totalDashboards > 0 && (
				<Menu.Item key="dashboards" icon={<Grid size={16} />} onClick={handleDashboardClick}>
					<Typography.Text strong>{totalDashboards}</Typography.Text>{' '}
					{pluralize('dashboard', totalDashboards)} using this metric
				</Menu.Item>
			)}
			{alertsData.isLoading && (
				<Menu.Item key="loading-alerts">
					<Skeleton.Input active size="small" style={{ width: '100%' }} />
				</Menu.Item>
			)}
			{dashboardsData.isLoading && (
				<Menu.Item key="loading-dashboards">
					<Skeleton.Input active size="small" style={{ width: '100%' }} />
				</Menu.Item>
			)}
		</Menu>
	);

	return (
		<Dropdown overlay={menu} trigger={['hover']} placement="bottomRight">
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '4px',
					color: Color.primary.primary,
					cursor: 'pointer',
				}}
			>
				<Bell size={14} />
				<Grid size={14} />
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
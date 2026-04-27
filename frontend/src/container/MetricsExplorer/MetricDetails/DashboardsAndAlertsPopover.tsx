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

	const hasAlerts = totalAlerts > 0;
	const hasDashboards = totalDashboards > 0;

	const handleAlertsClick = (): void => {
		if (!hasAlerts) return;

		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		});

		openInNewTab(`${ROUTES.ALERTS}?${searchParams.toString()}`);
	};

	const handleDashboardsClick = (): void => {
		if (!hasDashboards) return;

		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		});

		openInNewTab(`${ROUTES.DASHBOARDS}?${searchParams.toString()}`);
	};

	if (!metricName) return null;

	const loading = alertsData.isLoading || dashboardsData.isLoading;

	if (loading) {
		return (
			<div>
				<Skeleton.Input active size="small" style={{ width: 120 }} />
			</div>
		);
	}

	if (alertsData.isError || dashboardsData.isError) {
		return (
			<Typography.Text type="secondary" style={{ fontSize: 12 }}>
				Failed to load dashboards and alerts
			</Typography.Text>
		);
	}

	const menu = (
		<Menu>
			{hasAlerts && (
				<Menu.Item key="alerts" onClick={handleAlertsClick} icon={<Bell size={14} />}>
					<Typography.Text style={{ fontSize: 12 }}>
						{pluralize('Alert', totalAlerts)} ({totalAlerts})
					</Typography.Text>
				</Menu.Item>
			)}
			{hasDashboards && (
				<Menu.Item
					key="dashboards"
					onClick={handleDashboardsClick}
					icon={<Grid size={14} />}
				>
					<Typography.Text style={{ fontSize: 12 }}>
						{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
					</Typography.Text>
				</Menu.Item>
			)}
			{!hasAlerts && !hasDashboards && (
				<Menu.Item key="empty" disabled>
					<Typography.Text type="secondary" style={{ fontSize: 12 }}>
						No dashboards or alerts using this metric
					</Typography.Text>
				</Menu.Item>
			)}
		</Menu>
	);

	return (
		<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
			<div
				style={{
					color: Color.primary[500],
					cursor: 'pointer',
					fontSize: 12,
					display: 'flex',
					alignItems: 'center',
					gap: 4,
				}}
			>
				{hasAlerts && (
					<>
						<Bell size={12} />
						<span>{totalAlerts}</span>
					</>
				)}
				{hasDashboards && (
					<>
						<Grid size={12} />
						<span>{totalDashboards}</span>
					</>
				)}
				{!hasAlerts && !hasDashboards && (
					<Typography.Text type="secondary">No references</Typography.Text>
				)}
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
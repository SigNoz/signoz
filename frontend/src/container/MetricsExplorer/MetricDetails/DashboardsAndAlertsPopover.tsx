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
		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		});
		openInNewTab(`${ROUTES.ALERTS}?${searchParams.toString()}`);
	};

	const handleDashboardsClick = (): void => {
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
				<Skeleton.Input active size="small" />
			</div>
		);
	}

	if (alertsData.isError || dashboardsData.isError) {
		return (
			<Typography.Text type="secondary">Failed to load data</Typography.Text>
		);
	}

	const menu = (
		<Menu>
			{hasAlerts && (
				<Menu.Item key="alerts" icon={<Bell size={16} />} onClick={handleAlertsClick}>
					<Typography.Text strong>
						{totalAlerts} {pluralize('alert', totalAlerts)} using this metric
					</Typography.Text>
				</Menu.Item>
			)}
			{hasDashboards && (
				<Menu.Item
					key="dashboards"
					icon={<Grid size={16} />}
					onClick={handleDashboardsClick}
				>
					<Typography.Text strong>
						{totalDashboards} {pluralize('dashboard', totalDashboards)} using this metric
					</Typography.Text>
				</Menu.Item>
			)}
			{!hasAlerts && !hasDashboards && (
				<Menu.Item key="empty" disabled>
					<Typography.Text type="secondary">
						No alerts or dashboards using this metric
					</Typography.Text>
				</Menu.Item>
			)}
		</Menu>
	);

	return (
		<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
			<div
				style={{
					color: Color.semantic.text.secondary,
					cursor: 'pointer',
					fontSize: 12,
					display: 'flex',
					alignItems: 'center',
					gap: 4,
				}}
			>
				{hasAlerts && (
					<span>
						<Bell size={12} style={{ color: Color.semantic.warning.border }} />
					</span>
				)}
				{hasDashboards && (
					<span>
						<Grid size={12} style={{ color: Color.semantic.info.border }} />
					</span>
				)}
				{totalAlerts + totalDashboards > 0 ? (
					<Typography.Text type="secondary">
						{totalAlerts + totalDashboards} {pluralize('item', totalAlerts + totalDashboards)}{' '}
						using
					</Typography.Text>
				) : (
					<Typography.Text type="secondary">No usage</Typography.Text>
				)}
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
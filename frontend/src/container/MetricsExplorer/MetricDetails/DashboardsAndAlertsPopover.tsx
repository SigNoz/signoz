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
		openInNewTab(
			`${ROUTES.ALERTS}?${QueryParams.search}=${encodeURIComponent(
				metricName,
			)}`,
		);
	};

	const handleDashboardsClick = (): void => {
		if (!hasDashboards) return;
		openInNewTab(
			`${ROUTES.DASHBOARD_BUILDER}?${QueryParams.search}=${encodeURIComponent(
				metricName,
			)}`,
		);
	};

	const renderContent = (): JSX.Element => {
		if (alertsData.isLoading || dashboardsData.isLoading) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (alertsData.isError || dashboardsData.isError) {
			return (
				<Typography.Text type="secondary">
					Failed to load dashboards or alerts.
				</Typography.Text>
			);
		}

		if (!hasAlerts && !hasDashboards) {
			return (
				<Typography.Text type="secondary">
					No dashboards or alerts using this metric.
				</Typography.Text>
			);
		}

		return (
			<Menu>
				{hasAlerts && (
					<Menu.Item key="alerts" onClick={handleAlertsClick}>
						<span>
							<Bell size={14} style={{ marginRight: 8 }} />
							{pluralize('Alert', totalAlerts)} ({totalAlerts})
						</span>
					</Menu.Item>
				)}
				{hasDashboards && (
					<Menu.Item key="dashboards" onClick={handleDashboardsClick}>
						<span>
							<Grid size={14} style={{ marginRight: 8 }} />
							{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
						</span>
					</Menu.Item>
				)}
			</Menu>
		);
	};

	if (!metricName) return null;

	return (
		<Dropdown overlay={renderContent} trigger={['click']} placement="bottomRight">
			<div
				style={{
					color: Color.semantic.text.secondary,
					cursor: 'pointer',
					fontSize: 12,
					display: 'flex',
					alignItems: 'center',
				}}
			>
				<Bell size={12} style={{ marginRight: 4 }} />
				<Grid size={12} />
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
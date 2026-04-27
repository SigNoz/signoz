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

	const loading = alertsData.isLoading || dashboardsData.isLoading;
	const error = alertsData.isError || dashboardsData.isError;

	if (!metricName) return null;

	const renderContent = (): JSX.Element => {
		if (error) {
			return (
				<Typography.Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
					Failed to load alerts and dashboards.
				</Typography.Text>
			);
		}

		if (loading) {
			return (
				<div style={{ padding: '8px 12px', minWidth: 150 }}>
					<Skeleton active paragraph={{ rows: 2 }} />
				</div>
			);
		}

		if (!hasAlerts && !hasDashboards) {
			return (
				<Typography.Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
					No alerts or dashboards using this metric.
				</Typography.Text>
			);
		}

		return (
			<Menu style={{ minWidth: 200 }} selectable={false}>
				{hasAlerts && (
					<Menu.Item
						key="alerts"
						icon={<Bell size={16} />}
						onClick={(e): void => {
							e.domEvent.preventDefault();
							openInNewTab(
								`${ROUTES.ALERTS}?${QueryParams.search}=${encodeURIComponent(
									`metricName:${metricName}`,
								)}`,
							);
						}}
					>
						<Typography.Text strong>{totalAlerts}</Typography.Text>{' '}
						{pluralize('alert', totalAlerts)} using this metric
					</Menu.Item>
				)}
				{hasDashboards && (
					<Menu.Item
						key="dashboards"
						icon={<Grid size={16} />}
						onClick={(e): void => {
							e.domEvent.preventDefault();
							openInNewTab(
								`${ROUTES.DASHBOARDS}?${QueryParams.search}=${encodeURIComponent(
									metricName,
								)}`,
							);
						}}
					>
						<Typography.Text strong>{totalDashboards}</Typography.Text>{' '}
						{pluralize('dashboard', totalDashboards)} using this metric
					</Menu.Item>
				)}
			</Menu>
		);
	};

	return (
		<Dropdown overlay={renderContent} trigger={['click']} placement="bottomRight">
			<div
				style={{
					color: Color.semantic.text.secondary,
					cursor: 'pointer',
					fontSize: 14,
					display: 'flex',
					alignItems: 'center',
					gap: 4,
				}}
				onClick={(e): void => e.stopPropagation()}
			>
				{loading ? (
					<Skeleton.Input active size="small" style={{ width: 80 }} />
				) : (
					<>
						{totalAlerts + totalDashboards} {pluralize('item', totalAlerts + totalDashboards)}{' '}
						using this metric
					</>
				)}
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
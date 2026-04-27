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

	const renderContent = (): JSX.Element => {
		if (alertsData.isLoading || dashboardsData.isLoading) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (alertsData.isError || dashboardsData.isError) {
			return (
				<Typography.Text type="secondary">
					Failed to load alerts or dashboards.
				</Typography.Text>
			);
		}

		if (!hasAlerts && !hasDashboards) {
			return (
				<Typography.Text type="secondary">No alerts or dashboards.</Typography.Text>
			);
		}

		return (
			<Menu>
				{hasAlerts && (
					<Menu.Item key="alerts" onClick={handleAlertsClick}>
						<span>
							<Bell size={16} color={Color.primary['500']} />{' '}
							{pluralize('alert', totalAlerts)} found
						</span>
					</Menu.Item>
				)}
				{hasDashboards && (
					<Menu.Item key="dashboards" onClick={handleDashboardsClick}>
						<span>
							<Grid size={16} color={Color.primary['500']} />{' '}
							{pluralize('dashboard', totalDashboards)} found
						</span>
					</Menu.Item>
				)}
			</Menu>
		);
	};

	if (!metricName) return null;

	return (
		<Dropdown overlay={renderContent} trigger={['click']} placement="bottomRight">
			<span
				style={{
					color: Color.primary['500'],
					cursor: 'pointer',
					fontSize: '14px',
				}}
			>
				View in context
			</span>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
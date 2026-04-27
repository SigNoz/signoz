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

	const menu = (
		<Menu>
			<Menu.Item
				key="alerts"
				icon={<Bell size={16} />}
				disabled={!hasAlerts && !error}
				onClick={handleAlertsClick}
			>
				<Typography.Text
					strong
					style={{
						color: hasAlerts ? Color.text['text-primary'] : Color.text['text-tertiary'],
					}}
				>
					{error ? 'Error loading alerts' : `View ${pluralize('alert', totalAlerts, true)}`}
				</Typography.Text>
			</Menu.Item>
			<Menu.Item
				key="dashboards"
				icon={<Grid size={16} />}
				disabled={!hasDashboards && !error}
				onClick={handleDashboardsClick}
			>
				<Typography.Text
					strong
					style={{
						color: hasDashboards
							? Color.text['text-primary']
							: Color.text['text-tertiary'],
					}}
				>
					{error
						? 'Error loading dashboards'
						: `View ${pluralize('dashboard', totalDashboards, true)}`}
				</Typography.Text>
			</Menu.Item>
		</Menu>
	);

	if (loading) {
		return (
			<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
				<Skeleton.Button
					style={{
						width: 100,
						height: 32,
					}}
					active
				/>
			</Dropdown>
		);
	}

	if (error) {
		return (
			<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
				<Typography.Link>View related</Typography.Link>
			</Dropdown>
		);
	}

	if (!hasAlerts && !hasDashboards) {
		return null;
	}

	return (
		<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
			<Typography.Link>View related</Typography.Link>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
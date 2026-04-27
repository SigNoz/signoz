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

	const hasAnyItem = totalAlerts > 0 || totalDashboards > 0;

	if (!hasAnyItem && (alertsData.isLoading || dashboardsData.isLoading)) {
		return (
			<div className="flex flex-col gap-2 p-2">
				<Skeleton.Input active size="small" block />
				<Skeleton.Input active size="small" block />
			</div>
		);
	}

	if (!hasAnyItem) {
		return (
			<Typography.Text type="secondary" className="p-2">
				No dashboards or alerts found for this metric
			</Typography.Text>
		);
	}

	const menuItems = [];

	if (totalAlerts > 0) {
		menuItems.push({
			key: 'alerts',
			label: (
				<Typography.Text>
					{pluralize('Alert', totalAlerts)} ({totalAlerts})
				</Typography.Text>
			),
			icon: <Bell size={14} color={Color.semantic.warning} />,
			onClick: () => {
				openInNewTab(
					`${ROUTES.ALERTS}?${QueryParams.search}=${metricName}`,
				);
			},
		});
	}

	if (totalDashboards > 0) {
		menuItems.push({
			key: 'dashboards',
			label: (
				<Typography.Text>
					{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
				</Typography.Text>
			),
			icon: <Grid size={14} color={Color.primary.primary} />,
			onClick: () => {
				openInNewTab(
					`${ROUTES.DASHBOARDS}?${QueryParams.search}=${metricName}`,
				);
			},
		});
	}

	const menu = <Menu items={menuItems} />;

	return (
		<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
			<div
				className="flex cursor-pointer items-center gap-1 px-2 py-1 text-xs text-secondary hover:bg-gray-100"
				onClick={(e) => e.stopPropagation()}
			>
				{totalAlerts > 0 && (
					<Bell size={12} color={Color.semantic.warning} />
				)}
				{totalDashboards > 0 && (
					<Grid size={12} color={Color.primary.primary} />
				)}
				<span>{totalAlerts + totalDashboards}</span>
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
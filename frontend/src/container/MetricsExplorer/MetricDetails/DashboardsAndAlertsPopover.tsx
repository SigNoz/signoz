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
		data: [],
		isLoading: false,
		isError: false,
	});
	const [dashboardsData, setDashboardsData] = useState({
		data: [],
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
			<div className="flex items-center gap-2 px-3 py-1.5">
				<Skeleton.Input active size="small" />
			</div>
		);
	}

	if (!hasAnyItem) {
		return null;
	}

	const menuItems = [];

	if (totalDashboards > 0) {
		menuItems.push({
			key: 'dashboards',
			label: (
				<Typography.Text
					className="flex cursor-pointer items-center gap-2"
					onClick={() => {
						openInNewTab(
							`${ROUTES.DASHBOARDS}?${QueryParams.search}=${metricName}`,
						);
					}}
				>
					<Grid size={14} color={Color.text.secondary} />
					{pluralize(totalDashboards, 'Dashboard', 'Dashboards')} using this metric
				</Typography.Text>
			),
		});
	}

	if (totalAlerts > 0) {
		menuItems.push({
			key: 'alerts',
			label: (
				<Typography.Text
					className="flex cursor-pointer items-center gap-2"
					onClick={() => {
						openInNewTab(
							`${ROUTES.LIST_ALERTS}?${QueryParams.search}=${metricName}`,
						);
					}}
				>
					<Bell size={14} color={Color.text.secondary} />
					{pluralize(totalAlerts, 'Alert', 'Alerts')} on this metric
				</Typography.Text>
			),
		});
	}

	return (
		<Dropdown
			menu={{ items: menuItems }}
			trigger={['click']}
			placement="bottomRight"
		>
			<div className="flex cursor-pointer items-center gap-1 px-2 py-1.5 hover:bg-gray-100">
				{totalDashboards > 0 && (
					<Grid size={14} color={Color.text.secondary} />
				)}
				{totalAlerts > 0 && (
					<Bell size={14} color={Color.text.secondary} />
				)}
				<Typography.Text type="secondary" className="text-xs">
					{totalAlerts + totalDashboards}
				</Typography.Text>
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
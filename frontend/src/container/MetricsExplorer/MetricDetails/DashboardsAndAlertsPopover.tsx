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

	useEffect(() => {
		setAlertsData({
			data: newAlertsData?.data?.alerts || [],
			isLoading: newIsLoadingAlerts,
			isError: newIsErrorAlerts,
		});
	}, [newAlertsData, newIsLoadingAlerts, newIsErrorAlerts]);

	useEffect(() => {
		setDashboardsData({
			data: newDashboardsData?.data?.dashboards || [],
			isLoading: newIsLoadingDashboards,
			isError: newIsErrorDashboards,
		});
	}, [newDashboardsData, newIsLoadingDashboards, newIsErrorDashboards]);

	const totalAlerts = alertsData.data.length;
	const totalDashboards = dashboardsData.data.length;

	const hasAnyData = totalAlerts > 0 || totalDashboards > 0;

	const menuItems = useMemo(() => {
		const items = [];

		if (totalAlerts > 0) {
			items.push({
				key: 'alerts',
				label: (
					<Typography.Text
						strong
						style={{ color: Color.text['active'], display: 'block' }}
					>
						{pluralize('Alert', totalAlerts)} ({totalAlerts})
					</Typography.Text>
				),
				icon: <Bell size={16} />,
				onClick: () => {
					openInNewTab(
						`${ROUTES.ALERTS_MANAGEMENT}?${QueryParams.search}=${metricName}`,
					);
				},
			});
		}

		if (totalDashboards > 0) {
			items.push({
				key: 'dashboards',
				label: (
					<Typography.Text
						strong
						style={{ color: Color.text['active'], display: 'block' }}
					>
						{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
					</Typography.Text>
				),
				icon: <Grid size={16} />,
				onClick: () => {
					openInNewTab(
						`${ROUTES.DASHBOARD_BUILDER}?${QueryParams.search}=${metricName}`,
					);
				},
			});
		}

		return items;
	}, [totalAlerts, totalDashboards, metricName]);

	if (!metricName) return null;

	if (!hasAnyData && (alertsData.isLoading || dashboardsData.isLoading)) {
		return (
			<Dropdown
				overlay={<Menu items={[]} />}
				trigger={['click']}
				disabled
			>
				<Skeleton.Input size="small" style={{ width: 120 }} active />
			</Dropdown>
		);
	}

	if (!hasAnyData) return null;

	return (
		<Dropdown
			overlay={<Menu items={menuItems} />}
			trigger={['click']}
		>
			<Typography.Link>
				{totalAlerts > 0
					? `${totalAlerts} ${pluralize('Alert', totalAlerts)}`
					: null}
				{totalAlerts > 0 && totalDashboards > 0 ? ' • ' : null}
				{totalDashboards > 0
					? `${totalDashboards} ${pluralize('Dashboard', totalDashboards)}`
					: null}
			</Typography.Link>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
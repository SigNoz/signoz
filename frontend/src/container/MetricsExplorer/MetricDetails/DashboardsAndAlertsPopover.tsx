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

	const totalItems = alertsData.data.length + dashboardsData.data.length;

	if (!metricName || totalItems === 0) {
		return null;
	}

	const menuItems = [
		...(alertsData.data.length > 0
			? [
					{
						key: 'alerts',
						label: (
							<Typography.Text
								strong
								style={{ color: Color.text['info'] }}
							>
								{pluralize('Alert', alertsData.data.length)} (
								{alertsData.data.length})
							</Typography.Text>
						),
						icon: <Bell size={14} color={Color.icon['info']} />,
						disabled: true,
					},
					...alertsData.data.map((alert: any) => ({
						key: `alert-${alert.id}`,
						label: (
							<Typography.Text
								style={{ cursor: 'pointer' }}
								onClick={() =>
									openInNewTab(
										generatePath(ROUTES.ALERTS_EDIT, {
											[QueryParams.alertId]: alert.id,
										}),
									)
								}
							>
								{alert.name}
							</Typography.Text>
						),
					})),
			  ]
			: []),
		...(dashboardsData.data.length > 0
			? [
					{
						key: 'dashboards',
						label: (
							<Typography.Text
								strong
								style={{ color: Color.text['info'] }}
							>
								{pluralize('Dashboard', dashboardsData.data.length)}{' '}
								({dashboardsData.data.length})
							</Typography.Text>
						),
						icon: <Grid size={14} color={Color.icon['info']} />,
						disabled: true,
					},
					...dashboardsData.data.map((dashboard: any) => ({
						key: `dashboard-${dashboard.dashboardId}`,
						label: (
							<Typography.Text
								style={{ cursor: 'pointer' }}
								onClick={() =>
									openInNewTab(
										generatePath(ROUTES.APPLICATION, {
											[QueryParams.dashboardId]:
												dashboard.dashboardId,
										}),
									)
								}
							>
								{dashboard.title}
							</Typography.Text>
						),
					})),
			  ]
			: []),
	];

	if (menuItems.length === 0) {
		return null;
	}

	const loading =
		alertsData.isLoading ||
		dashboardsData.isLoading ||
		newIsLoadingAlerts ||
		newIsLoadingDashboards;

	return (
		<Dropdown
			overlay={
				<Menu items={menuItems} style={{ maxHeight: 400, overflowY: 'auto' }} />
			}
			trigger={['click']}
			disabled={loading}
		>
			<Typography.Link disabled={loading}>
				{loading ? (
					<Skeleton.Input size="small" style={{ width: 80 }} />
				) : (
					`${totalItems} ${pluralize('item', totalItems)} found`
				)}
			</Typography.Link>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
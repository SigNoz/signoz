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
			<div style={{ padding: '8px 12px', minWidth: 150 }}>
				<Skeleton.Input active size="small" />
			</div>
		);
	}

	if (!hasAnyItem) {
		return null;
	}

	const menuItems = [
		...(totalAlerts > 0
			? [
					{
						key: 'alerts',
						label: (
							<Typography.Text
								strong
								style={{ color: Color.text['info'], display: 'flex', alignItems: 'center', gap: 8 }}
							>
								<Bell size={16} />
								{pluralize('Alert', totalAlerts)} ({totalAlerts})
							</Typography.Text>
						),
						onClick: () => {
							openInNewTab(
								`${ROUTES.ALERTS_MANAGEMENT}?${QueryParams.searchQuery}=${metricName}`,
							);
						},
					},
			  ]
			: []),
		...(totalDashboards > 0
			? [
					{
						key: 'dashboards',
						label: (
							<Typography.Text
								strong
								style={{ color: Color.text['success'], display: 'flex', alignItems: 'center', gap: 8 }}
							>
								<Grid size={16} />
								{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
							</Typography.Text>
						),
						onClick: () => {
							openInNewTab(
								`${ROUTES.DASHBOARD_BUILDER}?${QueryParams.searchQuery}=${metricName}`,
							);
						},
					},
			  ]
			: []),
	];

	const menu = <Menu items={menuItems} />;

	return (
		<Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
			<div
				style={{
					cursor: 'pointer',
					padding: '4px 8px',
					borderRadius: 4,
					backgroundColor: Color.bg['hover'],
					display: 'inline-flex',
					alignItems: 'center',
					gap: 4,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{totalAlerts > 0 && (
					<Bell size={14} style={{ color: Color.text['info'] }} />
				)}
				{totalDashboards > 0 && (
					<Grid size={14} style={{ color: Color.text['success'] }} />
				)}
				<Typography.Text type="secondary" style={{ fontSize: 12 }}>
					{totalAlerts + totalDashboards}
				</Typography.Text>
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
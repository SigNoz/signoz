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
						style={{ display: 'flex', alignItems: 'center', gap: 8 }}
					>
						<Bell size={16} color={Color.semantic.warning} />
						{pluralize('Alert', totalAlerts)} ({totalAlerts})
					</Typography.Text>
				),
				onClick: () => {
					openInNewTab(
						`/${ROUTES.ALERTS_MANAGEMENT}?${QueryParams.search}=${metricName}`,
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
						style={{ display: 'flex', alignItems: 'center', gap: 8 }}
					>
						<Grid size={16} color={Color.primary[500]} />
						{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
					</Typography.Text>
				),
				onClick: () => {
					openInNewTab(
						`/${ROUTES.DASHBOARD}?${QueryParams.search}=${metricName}`,
					);
				},
			});
		}

		return items;
	}, [totalAlerts, totalDashboards, metricName]);

	if (!hasAnyData) {
		return null;
	}

	return (
		<Dropdown
			menu={{ items: menuItems }}
			trigger={['click']}
			placement="bottomRight"
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 4,
					cursor: 'pointer',
					color: Color.text.accent,
					fontWeight: 500,
				}}
			>
				{totalAlerts > 0 && (
					<>
						<Bell size={14} color={Color.semantic.warning} />
						<span>{totalAlerts}</span>
					</>
				)}
				{totalDashboards > 0 && (
					<>
						<Grid size={14} color={Color.primary[500]} />
						<span>{totalDashboards}</span>
					</>
				)}
			</div>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
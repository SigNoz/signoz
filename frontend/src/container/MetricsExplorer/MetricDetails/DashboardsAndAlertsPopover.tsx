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

	if (!metricName) return null;

	if (
		(alertsData.isLoading && !alertsData.data.length) ||
		(dashboardsData.isLoading && !dashboardsData.data.length)
	) {
		return (
			<Skeleton
				paragraph={{ rows: 2 }}
				style={{ padding: '8px 0', width: '160px' }}
			/>
		);
	}

	const menuItems = [
		{
			key: 'alerts',
			disabled: !hasAlerts,
			label: (
				<Typography.Text
					type="secondary"
					style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					onClick={handleAlertsClick}
				>
					<Bell size={14} color={Color.semantic.warning.border} />
					{pluralize('Alert', totalAlerts)} ({totalAlerts})
				</Typography.Text>
			),
		},
		{
			key: 'dashboards',
			disabled: !hasDashboards,
			label: (
				<Typography.Text
					type="secondary"
					style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
					onClick={handleDashboardsClick}
				>
					<Grid size={14} color={Color.primary[500]} />
					{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
				</Typography.Text>
			),
		},
	];

	return (
		<Dropdown
			menu={{ items: menuItems }}
			trigger={['hover']}
			placement="bottomLeft"
		>
			<Typography.Link
				style={{
					fontSize: '12px',
					pointerEvents: hasAlerts || hasDashboards ? 'auto' : 'none',
					opacity: hasAlerts || hasDashboards ? 1 : 0.5,
				}}
			>
				View in {hasDashboards ? 'Dashboard' : 'Alert'} {hasAlerts && 'and Alert'}
			</Typography.Link>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
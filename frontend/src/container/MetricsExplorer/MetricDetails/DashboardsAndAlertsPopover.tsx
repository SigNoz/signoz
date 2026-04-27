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

	if (!metricName) return null;

	const totalAlerts = alertsData.data.length;
	const totalDashboards = dashboardsData.data.length;
	const hasAny = totalAlerts > 0 || totalDashboards > 0;

	if (!hasAny && (alertsData.isLoading || dashboardsData.isLoading)) {
		return (
			<Skeleton.Input
				style={{
					width: '120px',
					height: '20px',
				}}
				size="small"
			/>
		);
	}

	const menuItems = [];

	if (totalAlerts > 0) {
		menuItems.push({
			key: 'alerts',
			label: (
				<Typography.Text
					strong
					style={{
						color: Color.semantic.warning,
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
					}}
				>
					<Bell size={16} />
					{pluralize(totalAlerts, 'alert', 'alerts')} firing
				</Typography.Text>
			),
			onClick: (e): void => {
				e.domEvent.preventDefault();
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
				<Typography.Text
					strong
					style={{
						color: Color.primary.primary900,
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
					}}
				>
					<Grid size={16} />
					Show in {pluralize(totalDashboards, 'dashboard', 'dashboards')}
				</Typography.Text>
			),
			onClick: (e): void => {
				e.domEvent.preventDefault();
				openInNewTab(
					`${ROUTES.DASHBOARDS}?${QueryParams.search}=${metricName}`,
				);
			},
		});
	}

	if (!hasAny) {
		return (
			<Typography.Text
				type="secondary"
				style={{
					fontSize: '12px',
				}}
			>
				No dashboards or alerts
			</Typography.Text>
		);
	}

	return (
		<Dropdown
			menu={{ items: menuItems }}
			trigger={['click']}
			placement="bottomLeft"
		>
			<Typography.Link
				style={{
					fontSize: '12px',
					cursor: 'pointer',
				}}
				onClick={(e): void => {
					e.preventDefault();
				}}
			>
				{totalAlerts > 0
					? `${totalAlerts} ${pluralize(
							totalAlerts,
							'alert',
							'alerts',
					  )} firing`
					: `${totalDashboards} ${pluralize(
							totalDashboards,
							'dashboard',
							'dashboards',
					  )}`}
			</Typography.Link>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
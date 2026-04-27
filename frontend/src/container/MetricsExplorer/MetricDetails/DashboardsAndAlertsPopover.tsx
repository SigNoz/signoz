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

type Status = {
	data: any[];
	isLoading: boolean;
	isError: boolean;
	error?: any;
};

function getErrorStatus(isError: boolean, error: any): Status {
	if (isError) {
		return { data: [], isLoading: false, isError: true, error };
	}
	return { data: [], isLoading: false, isError: false };
}

function getLoadingStatus(isLoading: boolean): Status {
	if (isLoading) {
		return { data: [], isLoading, isError: false };
	}
	return { data: [], isLoading: false, isError: false };
}

function useMetricAlertsStatus(metricName: string): Status {
	const {
		data: newAlertsData,
		isLoading: newIsLoadingAlerts,
		isError: newIsErrorAlerts,
		error: newErrorAlerts,
	} = useGetMetricAlerts(
		{
			metricName,
		},
		{ query: { enabled: !!metricName } },
	);

	if (newIsErrorAlerts) {
		return getErrorStatus(newIsErrorAlerts, newErrorAlerts);
	}

	if (newIsLoadingAlerts) {
		return getLoadingStatus(newIsLoadingAlerts);
	}

	return { data: newAlertsData || [], isLoading: false, isError: false };
}

function useMetricDashboardsStatus(metricName: string): Status {
	const {
		data: newDashboardsData,
		isLoading: newIsLoadingDashboards,
		isError: newIsErrorDashboards,
		error: newErrorDashboards,
	} = useGetMetricDashboards(
		{
			metricName,
		},
		{ query: { enabled: !!metricName } },
	);

	if (newIsErrorDashboards) {
		return getErrorStatus(newIsErrorDashboards, newErrorDashboards);
	}

	if (newIsLoadingDashboards) {
		return getLoadingStatus(newIsLoadingDashboards);
	}

	return { data: newDashboardsData || [], isLoading: false, isError: false };
}

function getAlertsMenuItems(alerts: any[], metricName: string) {
	if (alerts.length === 0) {
		return [
			{
				key: 'no-alerts',
				label: (
					<Typography.Text type="secondary" style={{ fontSize: 12 }}>
						No alerts configured
					</Typography.Text>
				),
				disabled: true,
			},
		];
	}

	return alerts.map((alert) => ({
		key: alert.uuid,
		label: (
			<Typography.Text
				ellipsis
				style={{ maxWidth: 200, fontSize: 12, color: Color.text.primary }}
			>
				{alert.name}
			</Typography.Text>
		),
		onClick: () => {
			const path = generatePath(ROUTES.LIST_ALERTS);
			openInNewTab(`${path}?${QueryParams.alertId}=${alert.uuid}`);
		},
	}));
}

function getDashboardsMenuItems(dashboards: any[], metricName: string) {
	if (dashboards.length === 0) {
		return [
			{
				key: 'no-dashboards',
				label: (
					<Typography.Text type="secondary" style={{ fontSize: 12 }}>
						No dashboards using this metric
					</Typography.Text>
				),
				disabled: true,
			},
		];
	}

	return dashboards.map((dashboard) => ({
		key: dashboard.dashboardId,
		label: (
			<Typography.Text
				ellipsis
				style={{ maxWidth: 200, fontSize: 12, color: Color.text.primary }}
			>
				{dashboard.dashboardName}
			</Typography.Text>
		),
		onClick: () => {
			const path = generatePath(ROUTES.APPLICATION, {
				dashboardId: dashboard.dashboardId,
			});
			openInNewTab(path);
		},
	}));
}

export function DashboardsAndAlertsPopover({
	metricName,
	children,
}: DashboardsAndAlertsPopoverProps) {
	const { data: alerts, isLoading: isLoadingAlerts, isError: isErrorAlerts } =
		useMetricAlertsStatus(metricName);
	const {
		data: dashboards,
		isLoading: isLoadingDashboards,
		isError: isErrorDashboards,
	} = useMetricDashboardsStatus(metricName);

	const isLoading = isLoadingAlerts || isLoadingDashboards;
	const isError = isErrorAlerts || isErrorDashboards;

	const menu = useMemo(() => {
		if (isLoading) {
			return (
				<Menu style={{ width: 200 }}>
					<Menu.Item key="loading" disabled>
						<Skeleton.Input active size="small" block />
					</Menu.Item>
				</Menu>
			);
		}

		if (isError) {
			return (
				<Menu style={{ width: 200 }}>
					<Menu.Item key="error" disabled>
						<Typography.Text type="danger" style={{ fontSize: 12 }}>
							Failed to load data
						</Typography.Text>
					</Menu.Item>
				</Menu>
			);
		}

		return (
			<Menu
				style={{ minWidth: 200 }}
				items={[
					{
						key: 'alerts',
						icon: <Bell size={12} />,
						label: (
							<Typography.Text strong style={{ fontSize: 12 }}>
								Alerts ({alerts.length})
							</Typography.Text>
						),
						children: getAlertsMenuItems(alerts, metricName),
					},
					{
						key: 'dashboards',
						icon: <Grid size={12} />,
						label: (
							<Typography.Text strong style={{ fontSize: 12 }}>
								Dashboards ({dashboards.length})
							</Typography.Text>
						),
						children: getDashboardsMenuItems(dashboards, metricName),
					},
				]}
			/>
		);
	}, [alerts, dashboards, isLoading, isError, metricName]);

	if (!metricName) {
		return <>{children}</>;
	}

	return (
		<Dropdown overlay={menu} trigger={['hover']} placement="bottomRight">
			{children}
		</Dropdown>
	);
}
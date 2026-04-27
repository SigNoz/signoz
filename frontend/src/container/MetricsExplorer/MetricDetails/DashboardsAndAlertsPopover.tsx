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
		isLoading: newIsLoadingDash,
		isError: newIsErrorDash,
		error: newErrorDash,
	} = useGetMetricDashboards(
		{
			metricName,
		},
		{ query: { enabled: !!metricName } },
	);

	if (newIsErrorDash) {
		return getErrorStatus(newIsErrorDash, newErrorDash);
	}

	if (newIsLoadingDash) {
		return getLoadingStatus(newIsLoadingDash);
	}

	return { data: newDashboardsData || [], isLoading: false, isError: false };
}

const { Text } = Typography;

export function DashboardsAndAlertsPopover({
	metricName,
	children,
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const [open, setOpen] = useState(false);

	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const totalAlerts = alertsStatus.data.length;
	const totalDashboards = dashboardsStatus.data.length;

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const dashboardItems = useMemo(() => {
		if (dashboardsStatus.isLoading) {
			return [
				{
					key: 'loading-dashboards',
					label: <Skeleton.Input active size="small" style={{ width: 120 }} />,
					disabled: true,
				},
			];
		}

		if (dashboardsStatus.isError) {
			return [
				{
					key: 'error-dashboards',
					label: <Text type="danger">Failed to load dashboards</Text>,
					disabled: true,
				},
			];
		}

		if (totalDashboards === 0) {
			return [
				{
					key: 'no-dashboards',
					label: <Text type="secondary">No dashboards found</Text>,
					disabled: true,
				},
			];
		}

		return dashboardsStatus.data.map((dashboard: any) => ({
			key: `dashboard-${dashboard.dashboardId}`,
			label: (
				<Text
					ellipsis
					style={{ maxWidth: 200, display: 'block' }}
					onClick={(e) => {
						e.stopPropagation();
						openInNewTab(
							`${generatePath(ROUTES.DASHBOARD, {
								dashboardId: dashboard.dashboardId,
							})}?${QueryParams.dashboardPanelType}=graph&${QueryParams.gaugeMetricName}=${metricName}`,
						);
					}}
				>
					{dashboard.title}
				</Text>
			),
		}));
	}, [dashboardsStatus, totalDashboards, metricName]);

	const alertItems = useMemo(() => {
		if (alertsStatus.isLoading) {
			return [
				{
					key: 'loading-alerts',
					label: <Skeleton.Input active size="small" style={{ width: 120 }} />,
					disabled: true,
				},
			];
		}

		if (alertsStatus.isError) {
			return [
				{
					key: 'error-alerts',
					label: <Text type="danger">Failed to load alerts</Text>,
					disabled: true,
				},
			];
		}

		if (totalAlerts === 0) {
			return [
				{
					key: 'no-alerts',
					label: <Text type="secondary">No alerts found</Text>,
					disabled: true,
				},
			];
		}

		return alertsStatus.data.map((alert: any) => ({
			key: `alert-${alert.alertId}`,
			label: (
				<Text
					ellipsis
					style={{ maxWidth: 200, display: 'block' }}
					onClick={(e) => {
						e.stopPropagation();
						openInNewTab(
							`${generatePath(ROUTES.ALERTS_EDIT, {
								id: alert.alertId,
							})}?${QueryParams.redirectTo}=${encodeURIComponent(window.location.pathname)}`,
						);
					}}
				>
					{alert.name}
				</Text>
			),
		}));
	}, [alertsStatus, totalAlerts, metricName]);

	const menu = (
		<Menu>
			{dashboardItems.length > 0 && (
				<Menu.ItemGroup key="dashboards" title={<span style={{ color: Color.text['tertiary'] }}>Dashboards</span>}>
					{dashboardItems}
				</Menu.ItemGroup>
			)}
			{alertItems.length > 0 && (
				<Menu.ItemGroup key="alerts" title={<span style={{ color: Color.text['tertiary'] }}>Alerts</span>}>
					{alertItems}
				</Menu.ItemGroup>
			)}
		</Menu>
	);

	const content = (
		<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
			{totalDashboards > 0 && (
				<div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: Color.text['secondary'] }}>
					<Grid size={14} />
					<Text type="secondary" style={{ fontSize: 12 }}>
						{pluralize('Dashboard', totalDashboards, true)}
					</Text>
				</div>
			)}
			{totalAlerts > 0 && (
				<div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: Color.text['secondary'] }}>
					<Bell size={14} />
					<Text type="secondary" style={{ fontSize: 12 }}>
						{pluralize('Alert', totalAlerts, true)}
					</Text>
				</div>
			)}
		</div>
	);

	return (
		<Dropdown
			overlay={menu}
			trigger={['hover']}
			placement="bottomLeft"
			open={open}
			onOpenChange={handleOpenChange}
			disabled={!metricName}
		>
			{children || content}
		</Dropdown>
	);
}
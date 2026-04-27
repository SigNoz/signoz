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

	return { data: newAlertsData?.data || [], isLoading: false, isError: false };
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

	return { data: newDashboardsData?.data || [], isLoading: false, isError: false };
}

export function DashboardsAndAlertsPopover({
	metricName,
	children,
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const [open, setOpen] = useState(false);

	const { data: alerts, isLoading: isLoadingAlerts, isError: isErrorAlerts } = useMetricAlertsStatus(metricName);
	const { data: dashboards, isLoading: isLoadingDashboards, isError: isErrorDashboards } = useMetricDashboardsStatus(metricName);

	const isLoading = isLoadingAlerts || isLoadingDashboards;
	const hasAlerts = !isLoadingAlerts && alerts.length > 0;
	const hasDashboards = !isLoadingDashboards && dashboards.length > 0;

	const handleOpenChange = (visible: boolean) => {
		setOpen(visible);
	};

	const handleAlertClick = (alertId: string) => {
		const path = generatePath(ROUTES.ALERT_DETAILS, { [QueryParams.alertId]: alertId });
		openInNewTab(path);
	};

	const handleDashboardClick = (dashboardId: string) => {
		const path = generatePath(ROUTES.DASHBOARD, { [QueryParams.dashboardId]: dashboardId });
		openInNewTab(path);
	};

	const menu = useMemo(() => {
		if (isLoading) {
			return (
				<Menu>
					<Menu.Item key="loading">
						<Skeleton.Input active size="small" style={{ width: '100%' }} />
					</Menu.Item>
				</Menu>
			);
		}

		if (isErrorAlerts || isErrorDashboards) {
			return (
				<Menu>
					<Menu.Item key="error" disabled>
						<Typography.Text type="danger">Failed to load data</Typography.Text>
					</Menu.Item>
				</Menu>
			);
		}

		const items = [];

		if (hasAlerts) {
			items.push(
				<Menu.ItemGroup key="alerts" title="Alerts">
					{alerts.map((alert: any) => (
						<Menu.Item key={`alert-${alert.id}`} onClick={() => handleAlertClick(alert.id)}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<Bell size={14} color={Color.semantic.warning} />
								<Typography.Text style={{ fontSize: '12px' }} title={alert.name}>
									{alert.name}
								</Typography.Text>
							</div>
						</Menu.Item>
					))}
				</Menu.ItemGroup>,
			);
		}

		if (hasDashboards) {
			items.push(
				<Menu.ItemGroup key="dashboards" title="Dashboards">
					{dashboards.map((dashboard: any) => (
						<Menu.Item key={`dashboard-${dashboard.id}`} onClick={() => handleDashboardClick(dashboard.id)}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<Grid size={14} color={Color.primary[500]} />
								<Typography.Text style={{ fontSize: '12px' }} title={dashboard.title}>
									{dashboard.title}
								</Typography.Text>
							</div>
						</Menu.Item>
					))}
				</Menu.ItemGroup>,
			);
		}

		if (!hasAlerts && !hasDashboards) {
			items.push(
				<Menu.Item key="empty" disabled>
					<Typography.Text type="secondary" style={{ fontSize: '12px' }}>
						No alerts or dashboards using this metric
					</Typography.Text>
				</Menu.Item>,
			);
		}

		return <Menu>{items}</Menu>;
	}, [alerts, dashboards, isLoading, isErrorAlerts, isErrorDashboards, hasAlerts, hasDashboards]);

	const totalItems = alerts.length + dashboards.length;
	const label = totalItems > 0 ? `${totalItems} ${pluralize('item', totalItems)} using this metric` : 'No items using this metric';

	return (
		<Dropdown overlay={menu} trigger={['hover']} open={open} onOpenChange={handleOpenChange}>
			<div style={{ display: 'inline-flex' }}>
				{children ?? (
					<Typography.Link style={{ fontSize: '12px' }} title={label}>
						{label}
					</Typography.Link>
				)}
			</div>
		</Dropdown>
	);
}
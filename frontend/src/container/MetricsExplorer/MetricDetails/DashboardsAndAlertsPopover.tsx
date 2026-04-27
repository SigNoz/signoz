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

	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const totalAssociatedItems =
		(alertsStatus.data?.length || 0) + (dashboardsStatus.data?.length || 0);

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const menuItems = useMemo(() => {
		const items = [];

		if (dashboardsStatus.isLoading) {
			items.push({
				key: 'dashboards-loading',
				label: (
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Grid size={14} color={Color.primary[500]} />
						<Skeleton.Input active size="small" style={{ width: 120 }} />
					</div>
				),
				disabled: true,
			});
		} else if (dashboardsStatus.isError) {
			items.push({
				key: 'dashboards-error',
				label: (
					<Typography.Text type="danger" style={{ fontSize: 12 }}>
						Failed to load dashboards
					</Typography.Text>
				),
				disabled: true,
			});
		} else {
			const dashboardCount = dashboardsStatus.data?.length || 0;
			items.push({
				key: 'dashboards',
				label: (
					<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Grid size={14} color={Color.primary[500]} />
						{pluralize('Dashboard', dashboardCount)} ({dashboardCount})
					</span>
				),
				onClick: (e) => {
					e.domEvent.preventDefault();
					e.domEvent.stopPropagation();
					openInNewTab(
						`${generatePath(ROUTES.DASHBOARDS)}?${QueryParams.search}=${metricName}`,
					);
				},
			});
		}

		if (alertsStatus.isLoading) {
			items.push({
				key: 'alerts-loading',
				label: (
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Bell size={14} color={Color.primary[500]} />
						<Skeleton.Input active size="small" style={{ width: 120 }} />
					</div>
				),
				disabled: true,
			});
		} else if (alertsStatus.isError) {
			items.push({
				key: 'alerts-error',
				label: (
					<Typography.Text type="danger" style={{ fontSize: 12 }}>
						Failed to load alerts
					</Typography.Text>
				),
				disabled: true,
			});
		} else {
			const alertCount = alertsStatus.data?.length || 0;
			items.push({
				key: 'alerts',
				label: (
					<span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Bell size={14} color={Color.primary[500]} />
						{pluralize('Alert', alertCount)} ({alertCount})
					</span>
				),
				onClick: (e) => {
					e.domEvent.preventDefault();
					e.domEvent.stopPropagation();
					openInNewTab(
						`${generatePath(ROUTES.ALL_ALERTS)}?${QueryParams.search}=${metricName}`,
					);
				},
			});
		}

		return items;
	}, [dashboardsStatus, alertsStatus, metricName]);

	const menu = <Menu items={menuItems} />;

	return (
		<Dropdown
			overlay={menu}
			trigger={['click']}
			open={open}
			onOpenChange={handleOpenChange}
			placement="bottomRight"
			destroyPopupOnHide
		>
			{children}
		</Dropdown>
	);
}
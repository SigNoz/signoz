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

export function DashboardsAndAlertsPopover({
	metricName,
	children,
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const [open, setOpen] = useState(false);

	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const totalItems =
		(alertsStatus.data?.length || 0) + (dashboardsStatus.data?.length || 0);

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const menuItems = useMemo(() => {
		const items: any[] = [];

		if (alertsStatus.isLoading) {
			items.push({
				key: 'alerts-loading',
				disabled: true,
				label: (
					<div className="flex items-center gap-2 px-2 py-1">
						<Bell size={14} color={Color.text.secondary} />
						<Skeleton.Input active size="small" style={{ width: 120 }} />
					</div>
				),
			});
		} else if (alertsStatus.isError) {
			items.push({
				key: 'alerts-error',
				disabled: true,
				label: (
					<Typography.Text type="secondary" className="px-2 py-1 text-xs">
						Failed to load alerts
					</Typography.Text>
				),
			});
		} else {
			const alertCount = alertsStatus.data?.length || 0;
			if (alertCount > 0) {
				items.push({
					key: 'alerts',
					label: (
						<Typography.Text
							className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs"
							onClick={() => {
								openInNewTab(
									`${ROUTES.LIST_ALERTS}?${QueryParams.search}=${metricName}`,
								);
							}}
						>
							<Bell size={14} color={Color.text.secondary} />
							{alertCount} {pluralize('alert', alertCount)} on this metric
						</Typography.Text>
					),
				});
			}
		}

		if (dashboardsStatus.isLoading) {
			items.push({
				key: 'dashboards-loading',
				disabled: true,
				label: (
					<div className="flex items-center gap-2 px-2 py-1">
						<Grid size={14} color={Color.text.secondary} />
						<Skeleton.Input active size="small" style={{ width: 120 }} />
					</div>
				),
			});
		} else if (dashboardsStatus.isError) {
			items.push({
				key: 'dashboards-error',
				disabled: true,
				label: (
					<Typography.Text type="secondary" className="px-2 py-1 text-xs">
						Failed to load dashboards
					</Typography.Text>
				),
			});
		} else {
			const dashboardCount = dashboardsStatus.data?.length || 0;
			if (dashboardCount > 0) {
				items.push({
					key: 'dashboards',
					label: (
						<Typography.Text
							className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs"
							onClick={() => {
								openInNewTab(
									`${ROUTES.DASHBOARDS}?${QueryParams.search}=${metricName}`,
								);
							}}
						>
							<Grid size={14} color={Color.text.secondary} />
							{dashboardCount} {pluralize('dashboard', dashboardCount)} using this
							metric
						</Typography.Text>
					),
				});
			}
		}

		if (items.length === 0) {
			items.push({
				key: 'empty',
				disabled: true,
				label: (
					<Typography.Text type="secondary" className="px-2 py-1 text-xs">
						No dashboards or alerts using this metric
					</Typography.Text>
				),
			});
		}

		return items;
	}, [alertsStatus, dashboardsStatus, metricName]);

	const menu = <Menu items={menuItems} />;

	return (
		<Dropdown
			overlay={menu}
			trigger={['click']}
			placement="bottomRight"
			open={open}
			onOpenChange={handleOpenChange}
		>
			{children}
		</Dropdown>
	);
}
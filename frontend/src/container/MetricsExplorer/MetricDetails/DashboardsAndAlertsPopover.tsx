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
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const [open, setOpen] = useState(false);

	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const totalAlerts = alertsStatus.data.length;
	const totalDashboards = dashboardsStatus.data.length;

	const isEmpty = totalAlerts === 0 && totalDashboards === 0;

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const handleViewAllAlerts = (): void => {
		openInNewTab(
			`${ROUTES.ALERTS_MANAGEMENT}?${QueryParams.search}=${metricName}`,
		);
	};

	const handleViewAllDashboards = (): void => {
		openInNewTab(
			`${ROUTES.DASHBOARD_BUILDER}?${QueryParams.search}=${metricName}`,
		);
	};

	const menu = useMemo(
		() => (
			<Menu>
				<Menu.Item
					key="alerts"
					icon={<Bell size={16} />}
					disabled={alertsStatus.isLoading || alertsStatus.isError}
					onClick={handleViewAllAlerts}
				>
					{alertsStatus.isLoading ? (
						<Skeleton.Input active size="small" />
					) : (
						<Typography.Text>
							{pluralize('Alert', totalAlerts)} ({totalAlerts})
						</Typography.Text>
					)}
				</Menu.Item>
				<Menu.Item
					key="dashboards"
					icon={<Grid size={16} />}
					disabled={dashboardsStatus.isLoading || dashboardsStatus.isError}
					onClick={handleViewAllDashboards}
				>
					{dashboardsStatus.isLoading ? (
						<Skeleton.Input active size="small" />
					) : (
						<Typography.Text>
							{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
						</Typography.Text>
					)}
				</Menu.Item>
			</Menu>
		),
		[
			alertsStatus.isLoading,
			alertsStatus.isError,
			totalAlerts,
			dashboardsStatus.isLoading,
			dashboardsStatus.isError,
			totalDashboards,
		],
	);

	return (
		<Dropdown
			overlay={menu}
			trigger={['click']}
			open={open}
			onOpenChange={handleOpenChange}
			disabled={isEmpty}
		>
			<span
				style={{
					color: Color.semantic.text.secondary,
					cursor: isEmpty ? 'not-allowed' : 'pointer',
					pointerEvents: isEmpty ? 'none' : 'auto',
				}}
			>
				{pluralize('Dashboard & Alert', totalDashboards + totalAlerts)}{' '}
				({totalDashboards + totalAlerts})
			</span>
		</Dropdown>
	);
}
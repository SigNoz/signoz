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

	const isLoading = alertsStatus.isLoading || dashboardsStatus.isLoading;
	const isError = alertsStatus.isError || dashboardsStatus.isError;

	const totalAlerts = alertsStatus.data.length;
	const totalDashboards = dashboardsStatus.data.length;

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const handleViewAllAlerts = (): void => {
		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		}).toString();

		openInNewTab(`${ROUTES.LIST_ALERTS}?${searchParams}`);
	};

	const handleViewAllDashboards = (): void => {
		const searchParams = new URLSearchParams({
			[QueryParams.search]: metricName,
		}).toString();

		openInNewTab(`${ROUTES.DASHBOARDS}?${searchParams}`);
	};

	const menu = useMemo(
		() => (
			<Menu>
				{isLoading ? (
					<Menu.Item key="loading">
						<Skeleton.Input active size="small" />
					</Menu.Item>
				) : isError ? (
					<Menu.Item key="error" disabled>
						<Typography.Text type="danger">Failed to load data</Typography.Text>
					</Menu.Item>
				) : (
					<>
						<Menu.Item
							key="alerts"
							icon={<Bell size={16} />}
							disabled={totalAlerts === 0}
							onClick={handleViewAllAlerts}
						>
							<Typography.Text
								style={{
									color:
										totalAlerts === 0
											? Color.text.disabled
											: Color.text.secondary,
								}}
							>
								{pluralize('Alert', totalAlerts)} ({totalAlerts})
							</Typography.Text>
						</Menu.Item>
						<Menu.Item
							key="dashboards"
							icon={<Grid size={16} />}
							disabled={totalDashboards === 0}
							onClick={handleViewAllDashboards}
						>
							<Typography.Text
								style={{
									color:
										totalDashboards === 0
											? Color.text.disabled
											: Color.text.secondary,
								}}
							>
								{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
							</Typography.Text>
						</Menu.Item>
					</>
				)}
			</Menu>
		),
		[
			isLoading,
			isError,
			totalAlerts,
			totalDashboards,
			metricName,
		],
	);

	return (
		<Dropdown
			overlay={menu}
			trigger={['click']}
			open={open}
			onOpenChange={handleOpenChange}
		>
			{children}
		</Dropdown>
	);
}
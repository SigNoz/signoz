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

	const totalAlerts = alertsStatus.data.length;
	const totalDashboards = dashboardsStatus.data.length;

	const handleOpenChange = (visible: boolean) => {
		setOpen(visible);
	};

	const handleAlertsClick = () => {
		openInNewTab(
			`/${ROUTES.ALERTS_MANAGEMENT_LIST}?${QueryParams.search}=${metricName}`,
		);
		setOpen(false);
	};

	const handleDashboardsClick = () => {
		openInNewTab(
			`/${ROUTES.DASHBOARD_LIST}?${QueryParams.search}=${metricName}`,
		);
		setOpen(false);
	};

	const loading = alertsStatus.isLoading || dashboardsStatus.isLoading;
	const hasAnyData = totalAlerts > 0 || totalDashboards > 0;

	const menu = (
		<Menu>
			{loading ? (
				<Menu.Item key="loading">
					<Skeleton.Input active size="small" style={{ width: '100%' }} />
				</Menu.Item>
			) : (
				<>
					{hasAnyData ? (
						<>
							{totalAlerts > 0 && (
								<Menu.Item key="alerts" onClick={handleAlertsClick}>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											width: '100%',
										}}
									>
										<span>
											<Bell size={14} style={{ marginRight: 8 }} />
											{pluralize('Alert', totalAlerts)} triggered
										</span>
										<Typography.Text type="secondary" style={{ fontSize: 12 }}>
											{totalAlerts}
										</Typography.Text>
									</div>
								</Menu.Item>
							)}
							{totalDashboards > 0 && (
								<Menu.Item key="dashboards" onClick={handleDashboardsClick}>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											width: '100%',
										}}
									>
										<span>
											<Grid size={14} style={{ marginRight: 8 }} />
											{pluralize('Dashboard', totalDashboards)} using this metric
										</span>
										<Typography.Text type="secondary" style={{ fontSize: 12 }}>
											{totalDashboards}
										</Typography.Text>
									</div>
								</Menu.Item>
							)}
						</>
					) : (
						<Menu.Item key="no-data" disabled>
							<Typography.Text type="secondary">
								No alerts or dashboards using this metric
							</Typography.Text>
						</Menu.Item>
					)}
				</>
			)}
		</Menu>
	);

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
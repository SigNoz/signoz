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

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const handleViewAllAlerts = (): void => {
		openInNewTab(
			`${ROUTES.LIST_ALERTS}?${QueryParams.search}=${metricName}`,
		);
	};

	const handleViewAllDashboards = (): void => {
		openInNewTab(
			`${ROUTES.DASHBOARDS_BUILDER}?${QueryParams.search}=${metricName}`,
		);
	};

	const renderContent = (): JSX.Element => {
		if (alertsStatus.isLoading || dashboardsStatus.isLoading) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (alertsStatus.isError || dashboardsStatus.isError) {
			return (
				<Typography.Text type="danger">Failed to load data</Typography.Text>
			);
		}

		if (totalAlerts === 0 && totalDashboards === 0) {
			return (
				<Typography.Text type="secondary">No dashboards or alerts</Typography.Text>
			);
		}

		return (
			<div style={{ minWidth: 200 }}>
				{totalAlerts > 0 && (
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 8,
						}}
					>
						<Typography.Text>
							<Bell size={14} style={{ marginRight: 8, color: Color.text.accent }} />
							{pluralize('Alert', totalAlerts)} ({totalAlerts})
						</Typography.Text>
						<Typography.Link
							onClick={handleViewAllAlerts}
							style={{ fontSize: 12 }}
						>
							View all
						</Typography.Link>
					</div>
				)}
				{totalDashboards > 0 && (
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<Typography.Text>
							<Grid size={14} style={{ marginRight: 8, color: Color.text.accent }} />
							{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
						</Typography.Text>
						<Typography.Link
							onClick={handleViewAllDashboards}
							style={{ fontSize: 12 }}
						>
							View all
						</Typography.Link>
					</div>
				)}
			</div>
		);
	};

	const menu = (
		<Menu>
			<Menu.Item key="content" disabled>
				{renderContent()}
			</Menu.Item>
		</Menu>
	);

	return (
		<Dropdown
			overlay={menu}
			trigger={['click']}
			open={open}
			onOpenChange={handleOpenChange}
			placement="bottomRight"
		>
			<Typography.Link
				onClick={(e) => {
					e.preventDefault();
					setOpen(!open);
				}}
				style={{ fontSize: 12 }}
			>
				View in dashboards & alerts
			</Typography.Link>
		</Dropdown>
	);
}
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

		return (
			<Menu>
				{totalAlerts > 0 && (
					<Menu.Item key="alerts" onClick={handleViewAllAlerts}>
						<div className="flex items-center gap-2">
							<Bell size={16} color={Color.semantic.warning} />
							<Typography.Text>
								{pluralize('alert', totalAlerts, 's')} on this metric
							</Typography.Text>
						</div>
					</Menu.Item>
				)}
				{totalDashboards > 0 && (
					<Menu.Item key="dashboards" onClick={handleViewAllDashboards}>
						<div className="flex items-center gap-2">
							<Grid size={16} color={Color.primary[500]} />
							<Typography.Text>
								{pluralize('dashboard', totalDashboards, 's')} using this metric
							</Typography.Text>
						</div>
					</Menu.Item>
				)}
				{totalAlerts === 0 && totalDashboards === 0 && (
					<Menu.Item key="empty">
						<Typography.Text type="secondary">
							No alerts or dashboards using this metric
						</Typography.Text>
					</Menu.Item>
				)}
			</Menu>
		);
	};

	return (
		<Dropdown
			menu={{ items: [] }}
			open={open}
			onOpenChange={handleOpenChange}
			overlay={renderContent()}
			trigger={['click']}
			placement="bottomRight"
		>
			<div className="flex cursor-pointer items-center gap-1 px-2 py-1 hover:bg-gray-100">
				{totalAlerts > 0 && (
					<Bell size={14} color={Color.semantic.warning} />
				)}
				{totalDashboards > 0 && (
					<Grid size={14} color={Color.primary[500]} />
				)}
				{(totalAlerts > 0 || totalDashboards > 0) && (
					<Typography.Text type="secondary" className="text-xs">
						{totalAlerts + totalDashboards}
					</Typography.Text>
				)}
			</div>
		</Dropdown>
	);
}
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

	const handleAlertClick = (): void => {
		const path = generatePath(ROUTES.LIST_ALERTS, {
			[QueryParams.tab]: 'metrics',
		});
		openInNewTab(path);
	};

	const handleDashboardClick = (): void => {
		const path = generatePath(ROUTES.DASHBOARDS);
		openInNewTab(path);
	};

	const renderContent = (): JSX.Element => {
		if (alertsStatus.isLoading || dashboardsStatus.isLoading) {
			return (
				<div style={{ padding: '8px 12px', minWidth: 150 }}>
					<Skeleton.Input active size="small" block />
				</div>
			);
		}

		if (totalAssociatedItems === 0) {
			return (
				<Typography.Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
					No dashboards or alerts using this metric
				</Typography.Text>
			);
		}

		return (
			<Menu>
				{alertsStatus.data.length > 0 && (
					<Menu.Item key="alerts" icon={<Bell size={16} />} onClick={handleAlertClick}>
						<Typography.Text strong>
							{pluralize('Alert', alertsStatus.data.length)} (
							{alertsStatus.data.length})
						</Typography.Text>
					</Menu.Item>
				)}
				{dashboardsStatus.data.length > 0 && (
					<Menu.Item key="dashboards" icon={<Grid size={16} />} onClick={handleDashboardClick}>
						<Typography.Text strong>
							{pluralize('Dashboard', dashboardsStatus.data.length)} (
							{dashboardsStatus.data.length})
						</Typography.Text>
					</Menu.Item>
				)}
			</Menu>
		);
	};

	return (
		<Dropdown
			overlay={renderContent()}
			trigger={['click']}
			open={open}
			onOpenChange={handleOpenChange}
			destroyPopupOnHide
		>
			{children}
		</Dropdown>
	);
}
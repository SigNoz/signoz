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
	trigger,
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const [open, setOpen] = useState(false);

	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const totalItems = (alertsStatus.data?.length || 0) + (dashboardsStatus.data?.length || 0);

	const handleOpenChange = (newOpen: boolean): void => {
		setOpen(newOpen);
	};

	const handleAlertClick = (e: React.MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
		const path = generatePath(ROUTES.LIST_ALERTS, {
			[QueryParams.tab]: 'metrics',
		});
		openInNewTab(path);
	};

	const handleDashboardClick = (e: React.MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
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

		if (alertsStatus.isError || dashboardsStatus.isError) {
			return (
				<div style={{ padding: '8px 12px', color: Color.semantic.error }}>
					Failed to load data
				</div>
			);
		}

		if (totalItems === 0) {
			return (
				<div style={{ padding: '8px 12px', color: Color.text.disabled }}>
					No dashboards or alerts
				</div>
			);
		}

		return (
			<Menu style={{ minWidth: 200, padding: '4px 0' }}>
				{alertsStatus.data.length > 0 && (
					<Menu.Item key="alerts" onClick={handleAlertClick} icon={<Bell size={16} />}>
						<Typography.Text style={{ fontSize: 14 }}>
							{pluralize('alert', alertsStatus.data.length, true)} on this metric
						</Typography.Text>
					</Menu.Item>
				)}
				{dashboardsStatus.data.length > 0 && (
					<Menu.Item key="dashboards" onClick={handleDashboardClick} icon={<Grid size={16} />}>
						<Typography.Text style={{ fontSize: 14 }}>
							{pluralize('dashboard', dashboardsStatus.data.length, true)} using this metric
						</Typography.Text>
					</Menu.Item>
				)}
			</Menu>
		);
	};

	return (
		<Dropdown
			open={open}
			onOpenChange={handleOpenChange}
			overlay={renderContent()}
			trigger={trigger}
			placement="bottomRight"
		>
			<div style={{ cursor: 'pointer', display: 'inline-block' }} />
		</Dropdown>
	);
}
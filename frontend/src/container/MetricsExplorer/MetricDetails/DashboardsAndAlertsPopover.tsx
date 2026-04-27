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

	const handleClickAlert = (e: React.MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
		const path = generatePath(ROUTES.LIST_ALERTS, {
			[QueryParams.tab]: 'metrics',
		});
		openInNewTab(path);
	};

	const handleClickDashboard = (e: React.MouseEvent): void => {
		e.preventDefault();
		e.stopPropagation();
		const path = generatePath(ROUTES.LIST_DASHBOARDS, {
			[QueryParams.tab]: 'metrics',
		});
		openInNewTab(path);
	};

	const renderContent = (): JSX.Element => {
		if (alertsStatus.isLoading || dashboardsStatus.isLoading) {
			return (
				<div style={{ padding: '8px 12px', minWidth: 150 }}>
					<Skeleton.Input active size="small" style={{ width: '100%' }} />
				</div>
			);
		}

		if (alertsStatus.isError || dashboardsStatus.isError) {
			return (
				<div style={{ padding: '8px 12px', color: Color.semantic.error[500] }}>
					Failed to load data
				</div>
			);
		}

		return (
			<Menu style={{ minWidth: 200 }}>
				<Menu.Item key="alerts" onClick={handleClickAlert} icon={<Bell size={16} />}>
					<Typography.Text strong>
						{pluralize('Alert', totalAlerts)} ({totalAlerts})
					</Typography.Text>
				</Menu.Item>
				<Menu.Item
					key="dashboards"
					onClick={handleClickDashboard}
					icon={<Grid size={16} />}
				>
					<Typography.Text strong>
						{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
					</Typography.Text>
				</Menu.Item>
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
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 4,
					cursor: 'pointer',
					color: Color.text.secondary,
					fontSize: 12,
					opacity: 0,
					transition: 'opacity 0.2s',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.opacity = '1';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.opacity = '0';
				}}
			>
				<Grid size={12} />
				<span>{totalDashboards + totalAlerts}</span>
			</div>
		</Dropdown>
	);
}
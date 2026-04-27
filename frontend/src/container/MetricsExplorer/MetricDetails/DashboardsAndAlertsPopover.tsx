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

	const isLoading = alertsStatus.isLoading || dashboardsStatus.isLoading;
	const isError = alertsStatus.isError || dashboardsStatus.isError;

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
		if (isError) {
			return (
				<div style={{ padding: '8px 12px' }}>
					<Typography.Text type="danger">Failed to load data</Typography.Text>
				</div>
			);
		}

		if (isLoading) {
			return (
				<div style={{ padding: '8px 12px', minWidth: 150 }}>
					<Skeleton active paragraph={{ rows: 2 }} />
				</div>
			);
		}

		if (totalAlerts === 0 && totalDashboards === 0) {
			return (
				<div style={{ padding: '8px 12px' }}>
					<Typography.Text type="secondary">No dashboards or alerts</Typography.Text>
				</div>
			);
		}

		return (
			<Menu style={{ minWidth: 200 }} onClick={(e) => e.domEvent.stopPropagation()}>
				{totalAlerts > 0 && (
					<Menu.Item key="alerts" onClick={handleViewAllAlerts}>
						<span>
							<Bell size={14} style={{ marginRight: 8 }} color={Color.text.danger} />
							{pluralize('alert', totalAlerts)} ({totalAlerts})
						</span>
					</Menu.Item>
				)}
				{totalDashboards > 0 && (
					<Menu.Item key="dashboards" onClick={handleViewAllDashboards}>
						<span>
							<Grid size={14} style={{ marginRight: 8 }} color={Color.text.link} />
							{pluralize('dashboard', totalDashboards)} ({totalDashboards})
						</span>
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
			<span
				style={{
					color: Color.text.secondary,
					cursor: 'pointer',
					fontSize: 12,
					display: 'flex',
					alignItems: 'center',
					gap: 4,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<Grid size={12} />
				Dashboards & Alerts
			</span>
		</Dropdown>
	);
}
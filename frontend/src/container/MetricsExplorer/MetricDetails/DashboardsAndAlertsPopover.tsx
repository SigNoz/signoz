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

	const hasAnyData = totalAlerts > 0 || totalDashboards > 0;

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const handleAlertsClick = (): void => {
		openInNewTab(
			`${ROUTES.ALERTS}?${QueryParams.search}=${metricName}&${QueryParams.tab}=rules`,
		);
	};

	const handleDashboardsClick = (): void => {
		openInNewTab(
			`${ROUTES.DASHBOARDS}?${QueryParams.search}=${metricName}`,
		);
	};

	const renderContent = (): JSX.Element => {
		if (alertsStatus.isLoading || dashboardsStatus.isLoading) {
			return (
				<div style={{ padding: '8px 12px', minWidth: 150 }}>
					<Skeleton active paragraph={{ rows: 2 }} />
				</div>
			);
		}

		if (!hasAnyData) {
			return (
				<Typography.Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
					No dashboards or alerts using this metric
				</Typography.Text>
			);
		}

		return (
			<Menu style={{ minWidth: 180 }}>
				{totalAlerts > 0 && (
					<Menu.Item key="alerts" onClick={handleAlertsClick} icon={<Bell size={16} />}>
						<Typography.Text strong>{totalAlerts}</Typography.Text>{' '}
						{pluralize('alert', totalAlerts)} using this metric
					</Menu.Item>
				)}
				{totalDashboards > 0 && (
					<Menu.Item key="dashboards" onClick={handleDashboardsClick} icon={<Grid size={16} />}>
						<Typography.Text strong>{totalDashboards}</Typography.Text>{' '}
						{pluralize('dashboard', totalDashboards)} using this metric
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
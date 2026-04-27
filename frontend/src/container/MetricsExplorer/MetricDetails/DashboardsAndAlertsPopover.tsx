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

	const handleAlertClick = (): void => {
		openInNewTab(
			`${ROUTES.ALERTS_MANAGEMENT}?${QueryParams.search}=${metricName}`,
		);
	};

	const handleDashboardClick = (): void => {
		openInNewTab(
			`${ROUTES.DASHBOARD_LIST}?${QueryParams.search}=${metricName}`,
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
			<Menu>
				{totalAlerts > 0 && (
					<Menu.Item key="alerts" onClick={handleAlertClick} icon={<Bell size={16} />}>
						<Typography.Text>
							{pluralize(totalAlerts, 'alert', 'alerts')}
						</Typography.Text>
					</Menu.Item>
				)}
				{totalDashboards > 0 && (
					<Menu.Item
						key="dashboards"
						onClick={handleDashboardClick}
						icon={<Grid size={16} />}
					>
						<Typography.Text>
							{pluralize(totalDashboards, 'dashboard', 'dashboards')}
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
			<Typography.Link
				onClick={(e) => {
					e.preventDefault();
					setOpen(true);
				}}
				style={{ color: Color.text.accent, fontSize: '12px' }}
			>
				View in dashboards & alerts
			</Typography.Link>
		</Dropdown>
	);
}
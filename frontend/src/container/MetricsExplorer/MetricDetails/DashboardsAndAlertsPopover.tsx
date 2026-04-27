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
	const [isOpen, setIsOpen] = useState(false);

	const { data: alerts, isLoading: isLoadingAlerts, isError: isErrorAlerts } =
		useMemo(() => useMetricAlertsStatus(metricName), [metricName]);

	const { data: dashboards, isLoading: isLoadingDashboards, isError: isErrorDashboards } =
		useMemo(() => useMetricDashboardsStatus(metricName), [metricName]);

	const totalAlerts = alerts.length;
	const totalDashboards = dashboards.length;

	const hasAlerts = totalAlerts > 0;
	const hasDashboards = totalDashboards > 0;

	const handleOpenChange = (open: boolean): void => {
		setIsOpen(open);
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
		const path = generatePath(ROUTES.LIST_DASHBOARDS, {
			[QueryParams.tab]: 'metrics',
		});
		openInNewTab(path);
	};

	const renderContent = (): JSX.Element => {
		if (isLoadingAlerts || isLoadingDashboards) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (isErrorAlerts || isErrorDashboards) {
			return (
				<Typography.Text type="secondary">
					Failed to load related resources.
				</Typography.Text>
			);
		}

		if (!hasAlerts && !hasDashboards) {
			return (
				<Typography.Text type="secondary">
					No dashboards or alerts using this metric.
				</Typography.Text>
			);
		}

		return (
			<Menu>
				{hasAlerts && (
					<Menu.Item key="alerts" icon={<Bell size={16} />} onClick={handleAlertClick}>
						<Typography.Text>
							{pluralize('alert', totalAlerts)} triggered by this metric
						</Typography.Text>
						<Typography.Text type="secondary" style={{ marginLeft: 8 }}>
							{totalAlerts}
						</Typography.Text>
					</Menu.Item>
				)}
				{hasDashboards && (
					<Menu.Item key="dashboards" icon={<Grid size={16} />} onClick={handleDashboardClick}>
						<Typography.Text>
							{pluralize('dashboard', totalDashboards)} using this metric
						</Typography.Text>
						<Typography.Text type="secondary" style={{ marginLeft: 8 }}>
							{totalDashboards}
						</Typography.Text>
					</Menu.Item>
				)}
			</Menu>
		);
	};

	return (
		<Dropdown
			menu={{ items: [] }}
			overlay={renderContent()}
			trigger={['click']}
			placement="bottomRight"
			open={isOpen}
			onOpenChange={handleOpenChange}
		>
			{children}
		</Dropdown>
	);
}
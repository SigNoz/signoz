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

	return {
		data: newAlertsData?.data || [],
		isLoading: false,
		isError: false,
	};
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

	return {
		data: newDashboardsData?.data || [],
		isLoading: false,
		isError: false,
	};
}

const DashboardsAndAlertsPopover = ({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element => {
	const [open, setOpen] = useState(false);

	const alertsStatus = useMetricAlertsStatus(metricName);
	const dashboardsStatus = useMetricDashboardsStatus(metricName);

	const totalAlerts = alertsStatus.data.length;
	const totalDashboards = dashboardsStatus.data.length;

	const isEmpty = totalAlerts === 0 && totalDashboards === 0;

	const handleOpenChange = (visible: boolean): void => {
		setOpen(visible);
	};

	const handleViewAllAlerts = (): void => {
		openInNewTab(
			`${ROUTES.ALERTS}?${QueryParams.search}=${metricName}`,
		);
	};

	const handleViewAllDashboards = (): void => {
		openInNewTab(
			`${ROUTES.DASHBOARDS}?${QueryParams.search}=${metricName}`,
		);
	};

	const renderContent = (): JSX.Element => {
		if (alertsStatus.isLoading || dashboardsStatus.isLoading) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (isEmpty) {
			return (
				<Typography.Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
					No dashboards or alerts found for this metric
				</Typography.Text>
			);
		}

		return (
			<Menu style={{ minWidth: 220 }}>
				{totalAlerts > 0 && (
					<Menu.Item key="alerts" onClick={handleViewAllAlerts}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<Bell size={16} color={Color.semantic.warning} />
							<span>
								{pluralize('Alert', totalAlerts)} ({totalAlerts})
							</span>
						</div>
					</Menu.Item>
				)}
				{totalDashboards > 0 && (
					<Menu.Item key="dashboards" onClick={handleViewAllDashboards}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							<Grid size={16} color={Color.primary.primary} />
							<span>
								{pluralize('Dashboard', totalDashboards)} ({totalDashboards})
							</span>
						</div>
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
			trigger={['click']}
			placement="bottomRight"
			destroyPopupOnHide
		>
			<div
				style={{
					cursor: 'pointer',
					color: Color.primary.primary,
					fontWeight: 500,
					fontSize: '14px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				View in Dashboards & Alerts
			</div>
		</Dropdown>
	);
};

export default DashboardsAndAlertsPopover;
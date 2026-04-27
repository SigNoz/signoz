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

function getAlertsMenuItems(handleAlertClick: (id: string) => void, alerts: any[]) {
	return alerts.map((alert) => ({
		key: alert.id,
		label: (
			<Typography.Text
				ellipsis
				style={{ maxWidth: 200 }}
				onClick={() => handleAlertClick(alert.id)}
			>
				{alert.name}
			</Typography.Text>
		),
	}));
}

function getDashboardsMenuItems(
	handleDashboardClick: (uid: string) => void,
	dashboards: any[],
) {
	return dashboards.map((dashboard) => ({
		key: dashboard.uid,
		label: (
			<Typography.Text
				ellipsis
				style={{ maxWidth: 200 }}
				onClick={() => handleDashboardClick(dashboard.uid)}
			>
				{dashboard.title}
			</Typography.Text>
		),
	}));
}

export function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps) {
	const [open, setOpen] = useState(false);

	const { data: alerts, isLoading: isLoadingAlerts, isError: isErrorAlerts } =
		useMetricAlertsStatus(metricName);
	const {
		data: dashboards,
		isLoading: isLoadingDashboards,
		isError: isErrorDashboards,
	} = useMetricDashboardsStatus(metricName);

	const totalItems = alerts.length + dashboards.length;

	const isLoading = isLoadingAlerts || isLoadingDashboards;
	const isError = isErrorAlerts || isErrorDashboards;

	const handleAlertClick = (id: string) => {
		const path = generatePath(ROUTES.ALERT_DETAIL, {
			[QueryParams.alertId]: id,
		});
		openInNewTab(path);
	};

	const handleDashboardClick = (uid: string) => {
		const path = generatePath(ROUTES.APPLICATION, {
			[QueryParams.dashboardUid]: uid,
		});
		openInNewTab(path);
	};

	const alertsMenuItems = useMemo(
		() => getAlertsMenuItems(handleAlertClick, alerts),
		[alerts, handleAlertClick],
	);

	const dashboardsMenuItems = useMemo(
		() => getDashboardsMenuItems(handleDashboardClick, dashboards),
		[dashboards, handleDashboardClick],
	);

	const menuItems = [
		...(alertsMenuItems.length > 0
			? [
					{
						type: 'group' as const,
						label: (
							<Typography.Text type="secondary" style={{ fontSize: 12 }}>
								{pluralize('Alert', alerts.length)} ({alerts.length})
							</Typography.Text>
						),
						children: alertsMenuItems,
					},
			  ]
			: []),
		...(dashboardsMenuItems.length > 0
			? [
					{
						type: 'group' as const,
						label: (
							<Typography.Text type="secondary" style={{ fontSize: 12 }}>
								{pluralize('Dashboard', dashboards.length)} ({dashboards.length})
							</Typography.Text>
						),
						children: dashboardsMenuItems,
					},
			  ]
			: []),
	];

	const content = useMemo(() => {
		if (isLoading) {
			return <Skeleton active paragraph={{ rows: 2 }} />;
		}

		if (isError || totalItems === 0) {
			return (
				<Typography.Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
					No dashboards or alerts found
				</Typography.Text>
			);
		}

		return (
			<Menu
				items={menuItems}
				style={{ maxHeight: 300, overflowY: 'auto', minWidth: 200 }}
				role="listbox"
			/>
		);
	}, [isLoading, isError, totalItems, menuItems]);

	return (
		<Dropdown
			menu={{ items: menuItems }}
			overlayStyle={{ minWidth: 220 }}
			placement="bottomRight"
			trigger={['click']}
			open={open}
			onOpenChange={setOpen}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 4,
					color: Color.primary.primary,
					cursor: 'pointer',
					fontSize: 14,
					padding: '2px 6px',
					borderRadius: 4,
					transition: 'all 0.2s',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = Color.bg.hover;
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = 'transparent';
				}}
			>
				<Grid size={14} />
				{totalItems > 0 && (
					<Typography.Text
						style={{
							color: Color.text['text-warning'],
							fontSize: 10,
							fontWeight: 600,
						}}
					>
						{totalItems}
					</Typography.Text>
				)}
			</div>
		</Dropdown>
	);
}
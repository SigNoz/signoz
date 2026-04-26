// File: frontend/src/container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover.tsx
import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { Dropdown, Skeleton, Typography } from 'antd';
import {
	useGetMetricAlerts,
	useGetMetricDashboards,
} from 'api/generated/services/metrics';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { Bell, Grid } from 'lucide-react';
import { openInNewTab } from 'utils/navigation';
import { pluralize } from 'utils/pluralize';

import { DashboardsAndAlertsPopoverProps } from './types';

function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element | null {
	const {
		data: alertsData,
		isLoading: isLoadingAlerts,
		isError: isErrorAlerts,
	} = useGetMetricAlerts(
		{
			metricName,
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const {
		data: dashboardsData,
		isLoading: isLoadingDashboards,
		isError: isErrorDashboards,
	} = useGetMetricDashboards(
		{
			metricName,
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const alerts = useMemo(() => {
		return alertsData?.data.alerts ?? [];
	}, [alertsData]);

	const dashboards = useMemo(() => {
		return dashboardsData?.data.dashboards ?? [];
	}, [dashboardsData]);

	if (isErrorAlerts || isErrorDashboards) {
		return (
			<Typography.Text type="danger" style={{ fontSize: '12px' }}>
				Failed to load dashboards or alerts
			</Typography.Text>
		);
	}

	if (isLoadingAlerts || isLoadingDashboards) {
		return <Skeleton.Input size="small" style={{ width: '120px' }} />;
	}

	const hasAlerts = alerts.length > 0;
	const hasDashboards = dashboards.length > 0;

	if (!hasAlerts && !hasDashboards) {
		return null;
	}

	const dropdownItems = [
		...(hasDashboards
			? [
					{
						key: 'dashboards',
						label: (
							<Typography.Text style={{ fontSize: '12px' }}>
								{pluralize('dashboard', dashboards.length, true)}
							</Typography.Text>
						),
						icon: <Grid size={12} style={{ color: Color.BG_VANILLA_100 }} />,
						disabled: true,
					},
					...dashboards.map((dashboard) => ({
						key: `dashboard-${dashboard.uuid}`,
						label: (
							<Typography.Text
								style={{ fontSize: '12px', color: Color.BG_VANILLA_100 }}
							>
								{dashboard.title}
							</Typography.Text>
						),
						onClick: (): void => {
							const path = generatePath(ROUTES.DASHBOARDS, {
								[QueryParams.dashboardId]: dashboard.uuid,
							});
							openInNewTab(path);
						},
					})),
			  ]
			: []),
		...(hasAlerts
			? [
					{
						key: 'alerts',
						label: (
							<Typography.Text style={{ fontSize: '12px' }}>
								{pluralize('alert', alerts.length, true)}
							</Typography.Text>
						),
						icon: <Bell size={12} style={{ color: Color.BG_VANILLA_100 }} />,
						disabled: true,
					},
					...alerts.map((alert) => ({
						key: `alert-${alert.id}`,
						label: (
							<Typography.Text
								style={{ fontSize: '12px', color: Color.BG_VANILLA_100 }}
							>
								{alert.name}
							</Typography.Text>
						),
						onClick: (): void => {
							const path = generatePath(ROUTES.ALERTS, {
								[QueryParams.alertId]: alert.id,
							});
							openInNewTab(path);
						},
					})),
			  ]
			: []),
	];

	return (
		<Dropdown
			menu={{ items: dropdownItems }}
			trigger={['hover']}
			placement="bottomLeft"
		>
			<Typography.Text
				style={{
					fontSize: '12px',
					color: Color.TEXT_DISABLED,
					cursor: 'pointer',
				}}
				onClick={(e): void => {
					e.preventDefault();
				}}
			>
				{[...(hasDashboards ? [pluralize('dashboard', dashboards.length, true)] : []), ...(hasAlerts ? [pluralize('alert', alerts.length, true)] : [])].join(
					', ',
				)}
			</Typography.Text>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
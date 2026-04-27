// File: frontend/src/container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover.tsx
import { useMemo, useState } from 'react';
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
	const [alertsData, setAlertsData] = useState({
		data: [],
		isLoading: false,
		isError: false,
	});
	const [dashboardsData, setDashboardsData] = useState({
		data: [],
		isLoading: false,
		isError: false,
	});

	const {
		data: newAlertsData,
		isLoading: newIsLoadingAlerts,
		isError: newIsErrorAlerts,
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
		data: newDashboardsData,
		isLoading: newIsLoadingDashboards,
		isError: newIsErrorDashboards,
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

	useEffect(() => {
		if (!newIsErrorAlerts && !newIsErrorDashboards) {
			setAlertsData({
				data: newAlertsData?.data.alerts ?? [],
				isLoading: newIsLoadingAlerts,
				isError: newIsErrorAlerts,
			});
			setDashboardsData({
				data: newDashboardsData?.data.dashboards ?? [],
				isLoading: newIsLoadingDashboards,
				isError: newIsErrorDashboards,
			});
		}
	}, [newAlertsData, newDashboardsData, newIsErrorAlerts, newIsErrorDashboards, newIsLoadingAlerts, newIsLoadingDashboards]);

	const alerts = useMemo(() => {
		return alertsData.data.alerts ?? [];
	}, [alertsData]);

	const dashboards = useMemo(() => {
		return dashboardsData.data.dashboards ?? [];
	}, [dashboardsData]);

	if (alertsData.isError || dashboardsData.isError) {
		return (
			<Typography.Text type="danger" style={{ fontSize: '12px' }}>
				Failed to load dashboards or alerts
			</Typography.Text>
		);
	}

	if (alertsData.isLoading || dashboardsData.isLoading) {
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
							const path = generatePath(ROUTES.DASHBOARD, {
								dashboardUuid: dashboard.uuid,
							});
							openInNewTab(path);
						},
					})),
			  ]
			: []),
	];

	return (
		<Dropdown
			overlay={
				<Dropdown.Menu>
					{dropdownItems.map((item) => (
						<Dropdown.Item key={item.key} onClick={item.onClick}>
							{item.label}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			}
			placement="bottomCenter"
		>
			<Bell size={12} style={{ color: Color.BG_VANILLA_100 }} />
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
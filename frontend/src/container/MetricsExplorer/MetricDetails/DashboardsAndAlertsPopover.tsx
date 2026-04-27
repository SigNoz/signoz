// File: frontend/src/container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover.tsx
import { Dropdown, Skeleton, Typography } from 'antd';
import { Bell, Grid } from 'lucide-react';
import { useMemo, useState } from 'react';
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

	useMemo(() => {
		if (!newIsErrorAlerts && !newIsErrorDashboards) {
			setAlertsData({
				data: newAlertsData?.data?.alerts || [],
				isLoading: newIsLoadingAlerts,
				isError: newIsErrorAlerts,
			});
			setDashboardsData({
				data: newDashboardsData?.data?.dashboards || [],
				isLoading: newIsLoadingDashboards,
				isError: newIsErrorDashboards,
			});
		}
	}, [
		newAlertsData,
		newDashboardsData,
		newIsErrorAlerts,
		newIsErrorDashboards,
		newIsLoadingAlerts,
		newIsLoadingDashboards,
	]);

	const alerts = useMemo(() => {
		return alertsData.data || [];
	}, [alertsData]);

	const dashboards = useMemo(() => {
		return dashboardsData.data || [];
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
		return (
			<Typography.Text type="secondary" style={{ fontSize: '12px' }}>
				No dashboards or alerts found
			</Typography.Text>
		);
	}

	const menuItems = [
		...(hasAlerts
			? [
					{
						key: 'alerts',
						label: (
							<Typography.Text
								style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
								onClick={(): void => {
									openInNewTab(
										`${ROUTES.ALERTS}?${QueryParams.searchKeyword}=${metricName}`,
									);
								}}
							>
								<Bell size={14} color={Color.primary['500']} />
								{pluralize('alert', alerts.length, true)} on this metric
							</Typography.Text>
						),
					},
			  ]
			: []),
		...(hasDashboards
			? [
					{
						key: 'dashboards',
						label: (
							<Typography.Text
								style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
								onClick={(): void => {
									openInNewTab(
										`${ROUTES.DASHBOARDS}?${QueryParams.searchKeyword}=${metricName}`,
									);
								}}
							>
								<Grid size={14} color={Color.primary['500']} />
								{pluralize('dashboard', dashboards.length, true)} using this metric
							</Typography.Text>
						),
					},
			  ]
			: []),
	];

	return (
		<Dropdown
			menu={{ items: menuItems }}
			trigger={['click']}
			placement="bottom"
			disabled={!hasAlerts && !hasDashboards}
		>
			<Typography.Text
				style={{
					color: Color.primary['500'],
					cursor: 'pointer',
					fontSize: '12px',
					textDecoration: 'underline',
				}}
			>
				{[hasAlerts ? pluralize('alert', alerts.length, true) : null]
					.concat(
						hasDashboards ? pluralize('dashboard', dashboards.length, true) : null,
					)
					.filter(Boolean)
					.join(' and ')}{' '}
				found
			</Typography.Text>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
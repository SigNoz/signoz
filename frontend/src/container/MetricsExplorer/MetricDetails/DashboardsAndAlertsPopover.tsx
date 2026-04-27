// File: frontend/src/container/MetricsExplorer/MetricDetails/DashboardsAndAlertsPopover.tsx
import { Dropdown, Menu, Skeleton, Typography } from 'antd';
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
		data: [] as Array<unknown>,
		isLoading: false,
		isError: false,
	});
	const [dashboardsData, setDashboardsData] = useState({
		data: [] as Array<unknown>,
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
	}, [
		newAlertsData,
		newIsLoadingAlerts,
		newIsErrorAlerts,
		newDashboardsData,
		newIsLoadingDashboards,
		newIsErrorDashboards,
	]);

	if (newIsLoadingAlerts || newIsLoadingDashboards) {
		return (
			<Skeleton active={true} paragraph={false} />
		);
	}

	if (newIsErrorAlerts || newIsErrorDashboards) {
		return (
			<Typography.Text type="danger">
				Failed to load alerts and dashboards.
			</Typography.Text>
		);
	}

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item key="alerts">
						<Typography.Text>
							{pluralize(newAlertsData.data.alerts.length, 'alert')}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item key="dashboards">
						<Typography.Text>
							{pluralize(newDashboardsData.data.dashboards.length, 'dashboard')}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item key="open-in-new-tab">
						<Typography.Text>
							Open in new tab
						</Typography.Text>
					</Menu.Item>
				</Menu>
			}
			trigger={['click']}
		>
			<Grid size={24} />
		</Dropdown>
	);
}
import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { Dropdown, Typography } from 'antd';
import { Skeleton } from 'antd/lib';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { Bell, Grid } from 'lucide-react';
import { pluralize } from 'utils/pluralize';

import { DashboardsAndAlertsPopoverProps } from './types';
import { transformMetricAlerts, transformMetricDashboards } from './utils';
import {
	useGetMetricAlerts,
	useGetMetricDashboards,
} from 'api/generated/services/metrics';

function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element | null {
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();

	const {
		data: alertsData,
		isLoading: isLoadingAlerts,
		isError: isErrorAlerts,
	} = useGetMetricAlerts(
		{
			metricName: metricName ?? '',
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
			metricName: metricName ?? '',
		},
		{
			query: {
				enabled: !!metricName,
			},
		},
	);

	const alerts = transformMetricAlerts(alertsData?.data);
	const dashboards = transformMetricDashboards(dashboardsData?.data);

	const alertsPopoverContent = useMemo(() => {
		if (alerts && alerts.length > 0) {
			return alerts.map((alert) => ({
				key: alert.alertId,
				label: (
					<Typography.Link
						key={alert.alertId}
						onClick={(): void => {
							params.set(QueryParams.ruleId, alert.alertId);
							history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
						}}
						className="dashboards-popover-content-item"
					>
						{alert.alertName || alert.alertId}
					</Typography.Link>
				),
			}));
		}
		return null;
	}, [alerts, params]);

	const dashboardsPopoverContent = useMemo(() => {
		if (dashboards && dashboards.length > 0) {
			return dashboards.map((dashboard) => ({
				key: dashboard.dashboardId,
				label: (
					<Typography.Link
						key={dashboard.dashboardId}
						onClick={(): void => {
							safeNavigate(
								generatePath(ROUTES.DASHBOARD, {
									dashboardId: dashboard.dashboardId,
								}),
							);
						}}
						className="dashboards-popover-content-item"
					>
						{dashboard.dashboardName || dashboard.dashboardId}
					</Typography.Link>
				),
			}));
		}
		return null;
	}, [dashboards, safeNavigate]);

	if (isLoadingAlerts || isLoadingDashboards) {
		return (
			<div className="dashboards-and-alerts-popover-container">
				<Skeleton title={false} paragraph={{ rows: 1 }} active />
			</div>
		);
	}

	// If there are no dashboards or alerts or both have errors, don't show the popover
	const hidePopover =
		(!dashboardsPopoverContent && !alertsPopoverContent) ||
		(isErrorAlerts && isErrorDashboards);
	if (hidePopover) {
		return <div className="dashboards-and-alerts-popover-container" />;
	}

	return (
		<div className="dashboards-and-alerts-popover-container">
			{dashboardsPopoverContent && (
				<Dropdown
					menu={{
						items: dashboardsPopoverContent,
					}}
					placement="bottomLeft"
					trigger={['click']}
				>
					<div
						className="dashboards-and-alerts-popover dashboards-popover"
						style={{ backgroundColor: `${Color.BG_SIENNA_500}33` }}
					>
						<Grid size={12} color={Color.BG_SIENNA_500} />
						<Typography.Text>
							{pluralize(dashboards.length, 'dashboard', 'dashboards')}
						</Typography.Text>
					</div>
				</Dropdown>
			)}
			{alertsPopoverContent && (
				<Dropdown
					menu={{
						items: alertsPopoverContent,
					}}
					placement="bottomLeft"
					trigger={['click']}
				>
					<div
						className="dashboards-and-alerts-popover alerts-popover"
						style={{ backgroundColor: `${Color.BG_SAKURA_500}33` }}
					>
						<Bell size={12} color={Color.BG_SAKURA_500} />
						<Typography.Text>
							{pluralize(alerts.length, 'alert rule', 'alert rules')}
						</Typography.Text>
					</div>
				</Dropdown>
			)}
		</div>
	);
}

export default DashboardsAndAlertsPopover;

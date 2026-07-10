import { generatePath } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import { Skeleton } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import {
	useGetMetricAlerts,
	useGetMetricDashboards,
} from 'api/generated/services/metrics';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { Bell, Grid2X2 } from '@signozhq/icons';
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

	const alerts = alertsData?.data.alerts ?? [];

	const currentDashboards = dashboardsData?.data.dashboards ?? [];
	const dashboards = currentDashboards.filter(
		(dashboard, index, self) =>
			index === self.findIndex((t) => t.dashboardId === dashboard.dashboardId),
	);

	const alertsPopoverContent =
		alerts.length > 0
			? alerts.map((alert) => ({
					key: alert.alertId,
					label: (
						<Typography.Link
							key={alert.alertId}
							onClick={(): void => {
								openInNewTab(
									`${ROUTES.ALERT_OVERVIEW}?${QueryParams.ruleId}=${alert.alertId}`,
								);
							}}
							className="dashboards-popover-content-item"
						>
							{alert.alertName || alert.alertId}
						</Typography.Link>
					),
				}))
			: null;

	const dashboardsPopoverContent =
		dashboards.length > 0
			? dashboards.map((dashboard) => ({
					key: dashboard.dashboardId,
					label: (
						<Typography.Link
							key={dashboard.dashboardId}
							onClick={(): void => {
								openInNewTab(
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
				}))
			: null;

	if (isLoadingAlerts || isLoadingDashboards) {
		return (
			<div className="dashboards-and-alerts-popover-container">
				<Skeleton title={false} paragraph={{ rows: 1 }} active />
			</div>
		);
	}

	const hidePopover =
		(!dashboardsPopoverContent && !alertsPopoverContent) ||
		(isErrorAlerts && isErrorDashboards);
	if (hidePopover) {
		return <div className="dashboards-and-alerts-popover-container" />;
	}

	return (
		<div className="dashboards-and-alerts-popover-container">
			{dashboardsPopoverContent && (
				<DropdownMenuSimple
					menu={{
						items: dashboardsPopoverContent,
					}}
					align="start"
				>
					<div
						className="dashboards-and-alerts-popover dashboards-popover"
						style={{ backgroundColor: `${Color.BG_SIENNA_500}33` }}
					>
						<Grid2X2 size={12} color={Color.BG_SIENNA_500} />
						<Typography.Text>
							{pluralize(dashboards.length, 'dashboard')}
						</Typography.Text>
					</div>
				</DropdownMenuSimple>
			)}
			{alertsPopoverContent && (
				<DropdownMenuSimple
					menu={{
						items: alertsPopoverContent,
					}}
					align="start"
				>
					<div
						className="dashboards-and-alerts-popover alerts-popover"
						style={{ backgroundColor: `${Color.BG_SAKURA_500}33` }}
					>
						<Bell size={12} color={Color.BG_SAKURA_500} />
						<Typography.Text>
							{pluralize(alerts.length, 'alert rule')}
						</Typography.Text>
					</div>
				</DropdownMenuSimple>
			)}
		</div>
	);
}

export default DashboardsAndAlertsPopover;

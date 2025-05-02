import { Color } from '@signozhq/design-tokens';
import { Dropdown, Typography } from 'antd';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { Bell, Grid } from 'lucide-react';
import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';

import { DashboardsAndAlertsPopoverProps } from './types';

function DashboardsAndAlertsPopover({
	alerts,
	dashboards,
}: DashboardsAndAlertsPopoverProps): JSX.Element | null {
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();

	const alertsPopoverContent = useMemo(() => {
		if (alerts && alerts.length > 0) {
			return alerts.map((alert) => ({
				key: alert.alert_id,
				label: (
					<Typography.Link
						key={alert.alert_id}
						onClick={(): void => {
							params.set(QueryParams.ruleId, alert.alert_id);
							history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
						}}
						className="dashboards-popover-content-item"
					>
						{alert.alert_name || alert.alert_id}
					</Typography.Link>
				),
			}));
		}
		return null;
	}, [alerts, params]);

	const uniqueDashboards = useMemo(
		() =>
			dashboards?.filter(
				(item, index, self) =>
					index === self.findIndex((t) => t.dashboard_id === item.dashboard_id),
			),
		[dashboards],
	);

	const dashboardsPopoverContent = useMemo(() => {
		if (uniqueDashboards && uniqueDashboards.length > 0) {
			return uniqueDashboards.map((dashboard) => ({
				key: dashboard.dashboard_id,
				label: (
					<Typography.Link
						key={dashboard.dashboard_id}
						onClick={(): void => {
							safeNavigate(
								generatePath(ROUTES.DASHBOARD, {
									dashboardId: dashboard.dashboard_id,
								}),
							);
						}}
						className="dashboards-popover-content-item"
					>
						{dashboard.dashboard_name || dashboard.dashboard_id}
					</Typography.Link>
				),
			}));
		}
		return null;
	}, [uniqueDashboards, safeNavigate]);

	if (!dashboardsPopoverContent && !alertsPopoverContent) {
		return null;
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
							{uniqueDashboards?.length} dashboard
							{uniqueDashboards?.length === 1 ? '' : 's'}
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
							{alerts?.length} alert {alerts?.length === 1 ? 'rule' : 'rules'}
						</Typography.Text>
					</div>
				</Dropdown>
			)}
		</div>
	);
}

export default DashboardsAndAlertsPopover;

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

	return { data: newAlertsData, isLoading: false, isError: false };
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

	return { data: newDashboardsData, isLoading: false, isError: false };
}

function DashboardsAndAlertsPopover({
	metricName,
}: DashboardsAndAlertsPopoverProps): JSX.Element {
	const metricAlertsStatus = useMetricAlertsStatus(metricName);
	const metricDashboardsStatus = useMetricDashboardsStatus(metricName);

	if (metricAlertsStatus.isError || metricDashboardsStatus.isError) {
		return (
			<Skeleton active loading={false}>
				<Typography.Text>
					{metricAlertsStatus.error?.message ||
						metricDashboardsStatus.error?.message ||
						'Error loading dashboards and alerts'}
				</Typography.Text>
			</Skeleton>
		);
	}

	if (metricAlertsStatus.isLoading || metricDashboardsStatus.isLoading) {
		return (
			<Skeleton active loading={true}>
				<Typography.Text>Loading...</Typography.Text>
			</Skeleton>
		);
	}

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item key="dashboards">
						<a
							onClick={() =>
								openInNewTab(
									generatePath(ROUTES.DASHBOARD_LIST, {
										metricName,
									}),
								)
							}
						>
							<Grid />
							<Typography.Text>
								{pluralize('dashboard', metricDashboardsStatus.data.length)}
							</Typography.Text>
						</a>
					</Menu.Item>
					<Menu.Item key="alerts">
						<a
							onClick={() =>
								openInNewTab(
									generatePath(ROUTES.ALERT_LIST, {
										metricName,
									}),
								)
							}
						>
							<Bell />
							<Typography.Text>
								{pluralize('alert', metricAlertsStatus.data.length)}
							</Typography.Text>
						</a>
					</Menu.Item>
				</Menu>
			}
		>
			<Typography.Text>
				{metricDashboardsStatus.data.length +
					metricAlertsStatus.data.length}{' '}
				{pluralize('item', metricDashboardsStatus.data.length + metricAlertsStatus.data.length)}
			</Typography.Text>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
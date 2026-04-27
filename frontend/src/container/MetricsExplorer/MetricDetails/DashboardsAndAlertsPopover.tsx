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

function useMetricStatus(metricName: string): Status {
	const metricAlertsStatus = useMetricAlertsStatus(metricName);
	const metricDashboardsStatus = useMetricDashboardsStatus(metricName);

	return { ...metricAlertsStatus, ...metricDashboardsStatus };
}

function DashboardsAndAlertsPopover({ metricName }: DashboardsAndAlertsPopoverProps) {
	const metricStatus = useMetricStatus(metricName);

	if (metricStatus.isError) {
		return (
			<Typography.Text>
				{metricStatus.error.message}
			</Typography.Text>
		);
	}

	if (metricStatus.isLoading) {
		return <Skeleton active />;
	}

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item>
						<a
							onClick={() => openInNewTab(generatePath(ROUTES.DASHBOARD, { metricName }))}
						>
							<Grid />
							{pluralize(metricStatus.data.length, 'dashboard')}
						</a>
					</Menu.Item>
					<Menu.Item>
						<a
							onClick={() => openInNewTab(generatePath(ROUTES.ALERTS, { metricName }))}
						>
							<Bell />
							{pluralize(metricStatus.data.length, 'alert')}
						</a>
					</Menu.Item>
				</Menu>
			}
		>
			<Typography.Text>
				Dashboards and Alerts
			</Typography.Text>
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
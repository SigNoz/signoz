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

function useMetricDetailsStatus(metricName: string): Status {
	const metricAlertsStatus = useMetricAlertsStatus(metricName);
	const metricDashboardsStatus = useMetricDashboardsStatus(metricName);

	return {
		data: { ...metricAlertsStatus.data, ...metricDashboardsStatus.data },
		isLoading: metricAlertsStatus.isLoading || metricDashboardsStatus.isLoading,
		isError: metricAlertsStatus.isError || metricDashboardsStatus.isError,
		error: metricAlertsStatus.error || metricDashboardsStatus.error,
	};
}

function DashboardsAndAlertsPopover({ metricName }: DashboardsAndAlertsPopoverProps) {
	const status = useMetricDetailsStatus(metricName);

	if (status.isError) {
		return (
			<Skeleton active>
				<Typography.Text>
					{pluralize('Error', status.error.message)}
				</Typography.Text>
			</Skeleton>
		);
	}

	if (status.isLoading) {
		return (
			<Skeleton active>
				<Typography.Text>Loading...</Typography.Text>
			</Skeleton>
		);
	}

	return (
		<Dropdown
			overlay={
				<Menu>
					<Menu.Item>
						<Typography.Text>
							{pluralize('Dashboard', status.data.dashboards.length)}
						</Typography.Text>
					</Menu.Item>
					<Menu.Item>
						<Typography.Text>
							{pluralize('Alert', status.data.alerts.length)}
						</Typography.Text>
					</Menu.Item>
				</Menu>
			}
		>
			<Grid size={24} />
		</Dropdown>
	);
}

export default DashboardsAndAlertsPopover;
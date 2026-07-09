import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Badge } from '@signozhq/ui/badge';
import { Progress } from '@signozhq/ui/progress';
import { Typography } from '@signozhq/ui/typography';
import {
	getHostLists,
	HostData,
	HostListPayload,
} from 'api/infraMonitoring/getHostLists';
import {
	createFilterItem,
	K8sDetailsFilters,
	K8sDetailsMetadataConfig,
} from 'container/InfraMonitoringK8sV2/Base/K8sBaseDetails';
import { K8sBaseFilters } from 'container/InfraMonitoringK8sV2/Base/types';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

import { getHostListsQuery } from './utils';

import infraHostsStyles from './InfraMonitoringHosts.module.scss';

export function getProgressColor(percent: number): string {
	if (percent >= 90) {
		return Color.BG_SAKURA_500;
	}
	if (percent >= 60) {
		return Color.BG_AMBER_500;
	}
	return Color.BG_FOREST_500;
}

export function getMemoryProgressColor(percent: number): string {
	if (percent >= 90) {
		return Color.BG_CHERRY_500;
	}
	if (percent >= 60) {
		return Color.BG_AMBER_500;
	}
	return Color.BG_FOREST_500;
}

export const hostDetailsMetadataConfig: K8sDetailsMetadataConfig<HostData>[] = [
	{
		label: 'STATUS',
		getValue: (h): string => (h.active ? 'ACTIVE' : 'INACTIVE'),
		render: (value, h): React.ReactNode => (
			<Badge
				variant="outline"
				className={`${infraHostsStyles.infraMonitoringTags} ${
					h.active ? infraHostsStyles.tagsActive : infraHostsStyles.tagsInactive
				}`}
			>
				{value}
			</Badge>
		),
	},
	{
		label: 'OPERATING SYSTEM',
		getValue: (h): string => h.os || '-',
		render: (value): React.ReactNode =>
			value !== '-' ? (
				<Badge variant="outline" className={infraHostsStyles.infraMonitoringTags}>
					{value}
				</Badge>
			) : (
				<Typography.Text>-</Typography.Text>
			),
	},
	{
		label: 'CPU USAGE',
		getValue: (h): number => h.cpu * 100,
		render: (value): React.ReactNode => (
			<Progress
				percent={Number(Number(value).toFixed(1))}
				strokeColor={getProgressColor(Number(value))}
				showInfo
			/>
		),
	},
	{
		label: 'MEMORY USAGE',
		getValue: (h): number => h.memory * 100,
		render: (value): React.ReactNode => (
			<Progress
				percent={Number(Number(value).toFixed(1))}
				strokeColor={getMemoryProgressColor(Number(value))}
				showInfo
			/>
		),
	},
];

export function getHostMetricsQueryPayload(
	host: HostData,
	start: number,
	end: number,
	dotMetricsEnabled: boolean,
): ReturnType<typeof getHostQueryPayload> {
	return getHostQueryPayload(host.hostName, start, end, dotMetricsEnabled);
}

export { hostWidgetInfo };

export function hostGetSelectedItemFilters(
	selectedItem: string,
	dotMetricsEnabled: boolean,
): TagFilter {
	const hostKey = dotMetricsEnabled ? 'host.name' : 'host_name';
	return {
		op: 'AND',
		items: [createFilterItem(hostKey, selectedItem)],
	};
}

export function hostInitialLogTracesFilter(
	host: HostData,
	dotMetricsEnabled: boolean,
): TagFilterItem[] {
	const hostKey = dotMetricsEnabled ? 'host.name' : 'host_name';
	return [createFilterItem(hostKey, host.hostName || '')];
}

export function hostInitialEventsFilter(_host: HostData): TagFilterItem[] {
	return [];
}

export const hostGetEntityName = (host: HostData): string => host.hostName;

export async function fetchHostListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): Promise<{
	data: HostData[];
	total: number;
	error?: string | null;
	rawData?: unknown;
}> {
	const baseQuery = getHostListsQuery();
	const payload: HostListPayload = {
		...baseQuery,
		limit: filters.limit,
		offset: filters.offset,
		filters: filters.filters ?? { items: [], op: 'and' },
		orderBy: filters.orderBy,
		start: filters.start,
		end: filters.end,
		groupBy: filters.groupBy ?? [],
	};

	const response = await getHostLists(payload, signal);

	return {
		data: response.payload?.data?.records || [],
		total: response.payload?.data?.total || 0,
		error: response.error,
		rawData: response.payload?.data,
	};
}

export async function fetchHostEntityData(
	filters: K8sDetailsFilters,
	signal?: AbortSignal,
): Promise<{ data: HostData | null; error?: string | null }> {
	const response = await getHostLists(
		{
			...getHostListsQuery(),
			filters: filters.filters,
			start: filters.start,
			end: filters.end,
			limit: 1,
			offset: 0,
			groupBy: [],
		},
		signal,
	);

	const records = response.payload?.data?.records || [];

	return {
		data: records.length > 0 ? records[0] : null,
		error: response.error,
	};
}

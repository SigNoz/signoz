import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Progress, Tag, Typography } from 'antd';
import {
	getHostLists,
	HostData,
	HostListPayload,
	HostListResponse,
} from 'api/infraMonitoring/getHostLists';
import {
	createFilterItem,
	K8sDetailsFilters,
	K8sDetailsMetadataConfig,
} from 'container/InfraMonitoringK8s/Base/K8sBaseDetails';
import type { K8sBaseListEmptyStateContext } from 'container/InfraMonitoringK8s/Base/K8sBaseList';
import { K8sBaseFilters } from 'container/InfraMonitoringK8s/Base/types';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

import HostsEmptyOrIncorrectMetrics from './HostsEmptyOrIncorrectMetrics';
import { getHostListsQuery } from './utils';

import hostsEmptyStateStyles from './HostsEmptyOrIncorrectMetrics.module.scss';
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
			<Tag
				className={`${infraHostsStyles.infraMonitoringTags} ${
					h.active ? infraHostsStyles.tagsActive : infraHostsStyles.tagsInactive
				}`}
				bordered
			>
				{value}
			</Tag>
		),
	},
	{
		label: 'OPERATING SYSTEM',
		getValue: (h): string => h.os || '-',
		render: (value): React.ReactNode =>
			value !== '-' ? (
				<Tag className={infraHostsStyles.infraMonitoringTags} bordered>
					{value}
				</Tag>
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
				size="small"
				strokeColor={getProgressColor(Number(value))}
			/>
		),
	},
	{
		label: 'MEMORY USAGE',
		getValue: (h): number => h.memory * 100,
		render: (value): React.ReactNode => (
			<Progress
				percent={Number(Number(value).toFixed(1))}
				size="small"
				strokeColor={getMemoryProgressColor(Number(value))}
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

function EndTimeBeforeRetentionMessage(): JSX.Element {
	return (
		<div className={hostsEmptyStateStyles.hostsEmptyStateContainer}>
			<div className={hostsEmptyStateStyles.hostsEmptyStateContainerContent}>
				<img
					className={hostsEmptyStateStyles.eyesEmoji}
					src="/Images/eyesEmoji.svg"
					alt="eyes emoji"
				/>
				<div className={hostsEmptyStateStyles.noHostsMessage}>
					<h5 className={hostsEmptyStateStyles.noHostsMessageTitle}>
						Queried time range is before earliest host metrics
					</h5>
					<p className={hostsEmptyStateStyles.messageBody}>
						Your requested end time is earlier than the earliest detected time of host
						metrics data, please adjust your end time.
					</p>
				</div>
			</div>
		</div>
	);
}

export function hostRenderEmptyState(
	context: K8sBaseListEmptyStateContext,
): React.ReactNode | null {
	if (context.isLoading) {
		return null;
	}

	const rawData = context.rawData as HostListResponse['data'] | undefined;

	if (!rawData?.sentAnyHostMetricsData || rawData?.isSendingK8SAgentMetrics) {
		return (
			<HostsEmptyOrIncorrectMetrics
				noData={!rawData?.sentAnyHostMetricsData}
				incorrectData={!!rawData?.isSendingK8SAgentMetrics}
			/>
		);
	}

	if (rawData?.endTimeBeforeRetention) {
		return <EndTimeBeforeRetentionMessage />;
	}

	return null;
}

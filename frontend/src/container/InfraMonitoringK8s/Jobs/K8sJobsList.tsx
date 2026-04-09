import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { getK8sJobsList, K8sJobsData } from './api';
import {
	getJobMetricsQueryPayload,
	jobWidgetInfo,
	k8sJobDetailsMetadataConfig,
	k8sJobGetEntityName,
	k8sJobGetSelectedItemFilters,
	k8sJobInitialEventsFilter,
	k8sJobInitialFilters,
	k8sJobInitialLogTracesFilter,
} from './constants';
import {
	k8sJobsColumns,
	k8sJobsColumnsConfig,
	k8sJobsRenderRowData,
} from './table.config';

function K8sJobsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			filters.orderBy ||= {
				columnName: 'cpu',
				order: 'desc',
			};

			const response = await getK8sJobsList(
				filters,
				signal,
				undefined,
				dotMetricsEnabled,
			);

			return {
				data: response.payload?.data.records || [],
				total: response.payload?.data.total || 0,
				error: response.error,
			};
		},
		[dotMetricsEnabled],
	);

	const fetchEntityData = useCallback(
		async (
			filters: K8sDetailsFilters,
			signal?: AbortSignal,
		): Promise<{ data: K8sJobsData | null; error?: string | null }> => {
			const response = await getK8sJobsList(
				{
					filters: filters.filters,
					start: filters.start,
					end: filters.end,
					limit: 1,
					offset: 0,
				},
				signal,
				undefined,
				dotMetricsEnabled,
			);

			const records = response.payload?.data.records || [];

			return {
				data: records.length > 0 ? records[0] : null,
				error: response.error,
			};
		},
		[dotMetricsEnabled],
	);

	return (
		<>
			<K8sBaseList<K8sJobsData>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.JOBS}
				tableColumnsDefinitions={k8sJobsColumns}
				tableColumns={k8sJobsColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sJobsRenderRowData}
				eventCategory={InfraMonitoringEvents.Job}
			/>

			<K8sBaseDetails<K8sJobsData>
				category={InfraMonitoringEntity.JOBS}
				eventCategory={InfraMonitoringEvents.Job}
				getSelectedItemFilters={k8sJobGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sJobGetEntityName}
				getInitialLogTracesFilters={k8sJobInitialLogTracesFilter}
				getInitialEventsFilters={k8sJobInitialEventsFilter}
				primaryFilterKeys={k8sJobInitialFilters}
				metadataConfig={k8sJobDetailsMetadataConfig}
				entityWidgetInfo={jobWidgetInfo}
				getEntityQueryPayload={getJobMetricsQueryPayload}
				queryKeyPrefix="job"
			/>
		</>
	);
}

export default K8sJobsList;

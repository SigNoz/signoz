import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { getK8sPodsList, K8sPodsData } from './api';
import {
	getPodMetricsQueryPayload,
	k8sPodDetailsMetadataConfig,
	k8sPodGetEntityName,
	k8sPodGetSelectedItemFilters,
	k8sPodInitialEventsFilter,
	k8sPodInitialFilters,
	k8sPodInitialLogTracesFilter,
	podWidgetInfo,
} from './constants';
import {
	k8sPodColumns,
	k8sPodColumnsConfig,
	k8sPodRenderRowData,
} from './table.config';

function K8sPodsList({
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

			const response = await getK8sPodsList(
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
		): Promise<{ data: K8sPodsData | null; error?: string | null }> => {
			const response = await getK8sPodsList(
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
			<K8sBaseList<K8sPodsData>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.PODS}
				tableColumnsDefinitions={k8sPodColumns}
				tableColumns={k8sPodColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sPodRenderRowData}
				eventCategory={InfraMonitoringEvents.Pod}
			/>

			<K8sBaseDetails<K8sPodsData>
				category={InfraMonitoringEntity.PODS}
				eventCategory={InfraMonitoringEvents.Pod}
				getSelectedItemFilters={k8sPodGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sPodGetEntityName}
				getInitialLogTracesFilters={k8sPodInitialLogTracesFilter}
				getInitialEventsFilters={k8sPodInitialEventsFilter}
				primaryFilterKeys={k8sPodInitialFilters}
				metadataConfig={k8sPodDetailsMetadataConfig}
				entityWidgetInfo={podWidgetInfo}
				getEntityQueryPayload={getPodMetricsQueryPayload}
				queryKeyPrefix="pod"
			/>
		</>
	);
}

export default K8sPodsList;

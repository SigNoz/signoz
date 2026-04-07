import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseFilters, K8sBaseList } from '../Base/K8sBaseList';
import { K8sCategory } from '../constants';
import { getK8sStatefulSetsList, K8sStatefulSetsData } from './api';
import {
	getStatefulSetMetricsQueryPayload,
	k8sStatefulSetDetailsMetadataConfig,
	k8sStatefulSetGetEntityName,
	k8sStatefulSetGetSelectedItemFilters,
	k8sStatefulSetInitialEventsFilter,
	k8sStatefulSetInitialFilters,
	k8sStatefulSetInitialLogTracesFilter,
	statefulSetWidgetInfo,
} from './constants';
import {
	k8sStatefulSetsColumns,
	k8sStatefulSetsColumnsConfig,
	k8sStatefulSetsRenderRowData,
} from './table';

function K8sStatefulSetsList({
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

			const response = await getK8sStatefulSetsList(
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
		): Promise<{ data: K8sStatefulSetsData | null; error?: string | null }> => {
			const response = await getK8sStatefulSetsList(
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
			<K8sBaseList<K8sStatefulSetsData>
				controlListPrefix={controlListPrefix}
				entity={K8sCategory.STATEFULSETS}
				tableColumnsDefinitions={k8sStatefulSetsColumns}
				tableColumns={k8sStatefulSetsColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sStatefulSetsRenderRowData}
				eventCategory={InfraMonitoringEvents.StatefulSet}
			/>

			<K8sBaseDetails<K8sStatefulSetsData>
				category={K8sCategory.STATEFULSETS}
				eventCategory={InfraMonitoringEvents.StatefulSet}
				getSelectedItemFilters={k8sStatefulSetGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sStatefulSetGetEntityName}
				getInitialLogTracesFilters={k8sStatefulSetInitialLogTracesFilter}
				getInitialEventsFilters={k8sStatefulSetInitialEventsFilter}
				primaryFilterKeys={k8sStatefulSetInitialFilters}
				metadataConfig={k8sStatefulSetDetailsMetadataConfig}
				entityWidgetInfo={statefulSetWidgetInfo}
				getEntityQueryPayload={getStatefulSetMetricsQueryPayload}
				queryKeyPrefix="statefulSet"
			/>
		</>
	);
}

export default K8sStatefulSetsList;

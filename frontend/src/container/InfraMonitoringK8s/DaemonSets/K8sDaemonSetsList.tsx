import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { getK8sDaemonSetsList, K8sDaemonSetsData } from './api';
import {
	daemonSetWidgetInfo,
	getDaemonSetMetricsQueryPayload,
	k8sDaemonSetDetailsMetadataConfig,
	k8sDaemonSetGetEntityName,
	k8sDaemonSetGetSelectedItemFilters,
	k8sDaemonSetInitialEventsFilter,
	k8sDaemonSetInitialFilters,
	k8sDaemonSetInitialLogTracesFilter,
} from './constants';
import {
	k8sDaemonSetsColumns,
	k8sDaemonSetsColumnsConfig,
	k8sDaemonSetsRenderRowData,
} from './table.config';

function K8sDaemonSetsList({
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

			const response = await getK8sDaemonSetsList(
				filters,
				signal,
				undefined,
				dotMetricsEnabled,
			);

			return {
				data: response.payload?.data.records || [],
				total: response.payload?.data.total || 0,
				error: response.error,
				rawData: response.payload?.data,
			};
		},
		[dotMetricsEnabled],
	);

	const fetchEntityData = useCallback(
		async (
			filters: K8sDetailsFilters,
			signal?: AbortSignal,
		): Promise<{ data: K8sDaemonSetsData | null; error?: string | null }> => {
			const response = await getK8sDaemonSetsList(
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
			<K8sBaseList<K8sDaemonSetsData>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.DAEMONSETS}
				tableColumnsDefinitions={k8sDaemonSetsColumns}
				tableColumns={k8sDaemonSetsColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sDaemonSetsRenderRowData}
				eventCategory={InfraMonitoringEvents.DaemonSet}
			/>

			<K8sBaseDetails<K8sDaemonSetsData>
				category={InfraMonitoringEntity.DAEMONSETS}
				eventCategory={InfraMonitoringEvents.DaemonSet}
				getSelectedItemFilters={k8sDaemonSetGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sDaemonSetGetEntityName}
				getInitialLogTracesFilters={k8sDaemonSetInitialLogTracesFilter}
				getInitialEventsFilters={k8sDaemonSetInitialEventsFilter}
				primaryFilterKeys={k8sDaemonSetInitialFilters}
				metadataConfig={k8sDaemonSetDetailsMetadataConfig}
				entityWidgetInfo={daemonSetWidgetInfo}
				getEntityQueryPayload={getDaemonSetMetricsQueryPayload}
				queryKeyPrefix="daemonset"
			/>
		</>
	);
}

export default K8sDaemonSetsList;

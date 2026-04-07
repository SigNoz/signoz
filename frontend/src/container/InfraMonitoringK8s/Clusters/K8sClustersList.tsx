import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { getK8sClustersList, K8sClusterData } from './api';
import {
	clusterWidgetInfo,
	getClusterMetricsQueryPayload,
	k8sClusterDetailsMetadataConfig,
	k8sClusterGetEntityName,
	k8sClusterGetSelectedItemFilters,
	k8sClusterInitialEventsFilter,
	k8sClusterInitialFilters,
	k8sClusterInitialLogTracesFilter,
} from './constants';
import {
	k8sClustersColumns,
	k8sClustersColumnsConfig,
	k8sClustersRenderRowData,
} from './table.config';

function K8sClustersList({
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

			const response = await getK8sClustersList(
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
		): Promise<{ data: K8sClusterData | null; error?: string | null }> => {
			const response = await getK8sClustersList(
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
			<K8sBaseList<K8sClusterData>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.CLUSTERS}
				tableColumnsDefinitions={k8sClustersColumns}
				tableColumns={k8sClustersColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sClustersRenderRowData}
				eventCategory={InfraMonitoringEvents.Cluster}
			/>

			<K8sBaseDetails<K8sClusterData>
				category={InfraMonitoringEntity.CLUSTERS}
				eventCategory={InfraMonitoringEvents.Cluster}
				getSelectedItemFilters={k8sClusterGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sClusterGetEntityName}
				getInitialLogTracesFilters={k8sClusterInitialLogTracesFilter}
				getInitialEventsFilters={k8sClusterInitialEventsFilter}
				primaryFilterKeys={k8sClusterInitialFilters}
				metadataConfig={k8sClusterDetailsMetadataConfig}
				entityWidgetInfo={clusterWidgetInfo}
				getEntityQueryPayload={getClusterMetricsQueryPayload}
				queryKeyPrefix="cluster"
			/>
		</>
	);
}

export default K8sClustersList;

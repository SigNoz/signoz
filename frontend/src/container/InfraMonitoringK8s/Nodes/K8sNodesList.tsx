import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { getK8sNodesList, K8sNodeData } from './api';
import {
	getNodeMetricsQueryPayload,
	k8sNodeDetailsMetadataConfig,
	k8sNodeGetEntityName,
	k8sNodeGetSelectedItemFilters,
	k8sNodeInitialEventsFilter,
	k8sNodeInitialFilters,
	k8sNodeInitialLogTracesFilter,
	nodeWidgetInfo,
} from './constants';
import {
	k8sNodesColumns,
	k8sNodesColumnsConfig,
	k8sNodesRenderRowData,
} from './table.config';

function K8sNodesList({
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

			const response = await getK8sNodesList(
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
		): Promise<{ data: K8sNodeData | null; error?: string | null }> => {
			const response = await getK8sNodesList(
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
			<K8sBaseList<K8sNodeData>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.NODES}
				tableColumnsDefinitions={k8sNodesColumns}
				tableColumns={k8sNodesColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sNodesRenderRowData}
				eventCategory={InfraMonitoringEvents.Node}
			/>

			<K8sBaseDetails<K8sNodeData>
				category={InfraMonitoringEntity.NODES}
				eventCategory={InfraMonitoringEvents.Node}
				getSelectedItemFilters={k8sNodeGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sNodeGetEntityName}
				getInitialLogTracesFilters={k8sNodeInitialLogTracesFilter}
				getInitialEventsFilters={k8sNodeInitialEventsFilter}
				primaryFilterKeys={k8sNodeInitialFilters}
				metadataConfig={k8sNodeDetailsMetadataConfig}
				entityWidgetInfo={nodeWidgetInfo}
				getEntityQueryPayload={getNodeMetricsQueryPayload}
				queryKeyPrefix="node"
			/>
		</>
	);
}

export default K8sNodesList;

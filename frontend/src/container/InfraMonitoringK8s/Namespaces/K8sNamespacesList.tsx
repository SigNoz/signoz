import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseFilters, K8sBaseList } from '../Base/K8sBaseList';
import { K8sCategory } from '../constants';
import { getK8sNamespacesList, K8sNamespacesData } from './api';
import {
	getNamespaceMetricsQueryPayload,
	k8sNamespaceDetailsMetadataConfig,
	k8sNamespaceGetEntityName,
	k8sNamespaceGetSelectedItemFilters,
	k8sNamespaceInitialEventsFilter,
	k8sNamespaceInitialFilters,
	k8sNamespaceInitialLogTracesFilter,
	namespaceWidgetInfo,
} from './constants';
import {
	k8sNamespacesColumns,
	k8sNamespacesColumnsConfig,
	k8sNamespacesRenderRowData,
} from './table';

function K8sNamespacesList({
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

			const response = await getK8sNamespacesList(
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
		): Promise<{ data: K8sNamespacesData | null; error?: string | null }> => {
			const response = await getK8sNamespacesList(
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
			<K8sBaseList<K8sNamespacesData>
				controlListPrefix={controlListPrefix}
				entity={K8sCategory.NAMESPACES}
				tableColumnsDefinitions={k8sNamespacesColumns}
				tableColumns={k8sNamespacesColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sNamespacesRenderRowData}
				eventCategory={InfraMonitoringEvents.Namespace}
			/>

			<K8sBaseDetails<K8sNamespacesData>
				category={K8sCategory.NAMESPACES}
				eventCategory={InfraMonitoringEvents.Namespace}
				getSelectedItemFilters={k8sNamespaceGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sNamespaceGetEntityName}
				getInitialLogTracesFilters={k8sNamespaceInitialLogTracesFilter}
				getInitialEventsFilters={k8sNamespaceInitialEventsFilter}
				primaryFilterKeys={k8sNamespaceInitialFilters}
				metadataConfig={k8sNamespaceDetailsMetadataConfig}
				entityWidgetInfo={namespaceWidgetInfo}
				getEntityQueryPayload={getNamespaceMetricsQueryPayload}
				queryKeyPrefix="namespace"
			/>
		</>
	);
}

export default K8sNamespacesList;

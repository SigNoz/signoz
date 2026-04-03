import React, { useCallback } from 'react';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseFilters, K8sBaseList } from '../Base/K8sBaseList';
import { K8sCategory } from '../constants';
import { getK8sVolumesList, K8sVolumesData } from './api';
import {
	getVolumeMetricsQueryPayload,
	k8sVolumeDetailsMetadataConfig,
	k8sVolumeGetEntityName,
	k8sVolumeGetSelectedItemFilters,
	k8sVolumeInitialEventsFilter,
	k8sVolumeInitialFilters,
	k8sVolumeInitialLogTracesFilter,
	volumeWidgetInfo,
} from './constants';
import {
	k8sVolumesColumns,
	k8sVolumesColumnsConfig,
	k8sVolumesRenderRowData,
} from './table';

function K8sVolumesList({
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
				columnName: 'usage',
				order: 'desc',
			};

			const response = await getK8sVolumesList(
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
		): Promise<{ data: K8sVolumesData | null; error?: string | null }> => {
			const response = await getK8sVolumesList(
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
			<K8sBaseList<K8sVolumesData>
				controlListPrefix={controlListPrefix}
				entity={K8sCategory.VOLUMES}
				tableColumnsDefinitions={k8sVolumesColumns}
				tableColumns={k8sVolumesColumnsConfig}
				fetchListData={fetchListData}
				renderRowData={k8sVolumesRenderRowData}
				eventCategory={InfraMonitoringEvents.Volumes}
			/>

			<K8sBaseDetails<K8sVolumesData>
				category={K8sCategory.VOLUMES}
				eventCategory={InfraMonitoringEvents.Volume}
				getSelectedItemFilters={k8sVolumeGetSelectedItemFilters}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sVolumeGetEntityName}
				getInitialLogTracesFilters={k8sVolumeInitialLogTracesFilter}
				getInitialEventsFilters={k8sVolumeInitialEventsFilter}
				primaryFilterKeys={k8sVolumeInitialFilters}
				metadataConfig={k8sVolumeDetailsMetadataConfig}
				entityWidgetInfo={volumeWidgetInfo}
				getEntityQueryPayload={getVolumeMetricsQueryPayload}
				queryKeyPrefix="volume"
				hideDetailViewTabs
			/>
		</>
	);
}

export default K8sVolumesList;

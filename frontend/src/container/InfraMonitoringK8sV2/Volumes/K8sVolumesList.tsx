import { useCallback } from 'react';
import { listVolumes } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesResponseTypeDTO,
	InframonitoringtypesVolumeRecordDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	getVolumeMetricsQueryPayload,
	k8sVolumeDetailsMetadataConfig,
	k8sVolumeGetEntityName,
	k8sVolumeGetSelectedItemExpression,
	k8sVolumeInitialEventsExpression,
	k8sVolumeInitialLogTracesExpression,
	volumeWidgetInfo,
} from './constants';
import {
	getK8sVolumeItemKey,
	getK8sVolumeRowKey,
	k8sVolumesColumnsConfig,
} from './table.config';

function K8sVolumesList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listVolumes(
					{
						filter: { expression: filters.filter.expression },
						groupBy: filters.groupBy?.map((g) => ({ name: g.name })),
						offset: filters.offset,
						limit: filters.limit ?? 10,
						start: filters.start,
						end: filters.end,
						orderBy: filters.orderBy
							? {
									key: { name: filters.orderBy.key.name },
									direction:
										filters.orderBy.direction === 'asc'
											? Querybuildertypesv5OrderDirectionDTO.asc
											: Querybuildertypesv5OrderDirectionDTO.desc,
								}
							: undefined,
					},
					signal,
				);

				const data = response.data;
				return {
					type:
						data.type === InframonitoringtypesResponseTypeDTO.grouped_list
							? ('grouped_list' as const)
							: ('list' as const),
					records: data.records,
					total: data.total,
					endTimeBeforeRetention: data.endTimeBeforeRetention,
					warning: data.warning,
				};
			} catch (error) {
				const errMsg =
					error instanceof Error ? error.message : 'Failed to fetch volumes';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesVolumeRecordDTO[],
					total: 0,
					error: errMsg,
				};
			}
		},
		[],
	);

	const fetchEntityData = useCallback(
		async (
			filters: K8sDetailsFilters,
			signal?: AbortSignal,
		): Promise<{
			data: InframonitoringtypesVolumeRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listVolumes(
					{
						filter: { expression: filters.filter.expression },
						start: filters.start,
						end: filters.end,
						limit: 1,
						offset: 0,
					},
					signal,
				);

				return {
					data: response.data.records.length > 0 ? response.data.records[0] : null,
				};
			} catch (error) {
				const errMsg =
					error instanceof Error ? error.message : 'Failed to fetch volume';
				return {
					data: null,
					error: errMsg,
				};
			}
		},
		[],
	);

	return (
		<>
			<K8sBaseList<InframonitoringtypesVolumeRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.VOLUMES}
				tableColumns={k8sVolumesColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sVolumeRowKey}
				getItemKey={getK8sVolumeItemKey}
				eventCategory={InfraMonitoringEvents.Volumes}
			/>

			<K8sBaseDetails<InframonitoringtypesVolumeRecordDTO>
				category={InfraMonitoringEntity.VOLUMES}
				eventCategory={InfraMonitoringEvents.Volume}
				getSelectedItemExpression={k8sVolumeGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sVolumeGetEntityName}
				getInitialLogTracesExpression={k8sVolumeInitialLogTracesExpression}
				getInitialEventsExpression={k8sVolumeInitialEventsExpression}
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

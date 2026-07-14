import { useCallback } from 'react';
import { listClusters } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesClusterRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import {
	clusterWidgetInfo,
	getClusterMetricsQueryPayload,
	k8sClusterDetailsMetadataConfig,
	k8sClusterGetEntityName,
	k8sClusterGetSelectedItemExpression,
	k8sClusterInitialEventsExpression,
	k8sClusterInitialLogTracesExpression,
} from './constants';
import {
	getK8sClusterItemKey,
	getK8sClusterRowKey,
	k8sClustersColumnsConfig,
} from './table.config';

function K8sClustersList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listClusters(
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
					error instanceof Error ? error.message : 'Failed to fetch clusters';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesClusterRecordDTO[],
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
			data: InframonitoringtypesClusterRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listClusters(
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
					error instanceof Error ? error.message : 'Failed to fetch cluster';
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
			<K8sBaseList<InframonitoringtypesClusterRecordDTO>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.CLUSTERS}
				tableColumns={k8sClustersColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sClusterRowKey}
				getItemKey={getK8sClusterItemKey}
				eventCategory={InfraMonitoringEvents.Cluster}
			/>

			<K8sBaseDetails<InframonitoringtypesClusterRecordDTO>
				category={InfraMonitoringEntity.CLUSTERS}
				eventCategory={InfraMonitoringEvents.Cluster}
				getSelectedItemExpression={k8sClusterGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sClusterGetEntityName}
				getInitialLogTracesExpression={k8sClusterInitialLogTracesExpression}
				getInitialEventsExpression={k8sClusterInitialEventsExpression}
				metadataConfig={k8sClusterDetailsMetadataConfig}
				entityWidgetInfo={clusterWidgetInfo}
				getEntityQueryPayload={getClusterMetricsQueryPayload}
				queryKeyPrefix="cluster"
			/>
		</>
	);
}

export default K8sClustersList;

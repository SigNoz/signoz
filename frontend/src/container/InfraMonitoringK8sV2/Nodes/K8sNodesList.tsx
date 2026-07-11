import { useCallback } from 'react';
import { listNodes } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesNodeRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import {
	getNodeMetricsQueryPayload,
	k8sNodeDetailsMetadataConfig,
	k8sNodeGetEntityName,
	k8sNodeGetSelectedItemExpression,
	k8sNodeInitialEventsExpression,
	k8sNodeInitialLogTracesExpression,
	nodeWidgetInfo,
} from './constants';
import {
	getK8sNodeItemKey,
	getK8sNodeRowKey,
	k8sNodesColumnsConfig,
} from './table.config';

function K8sNodesList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listNodes(
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
					error instanceof Error ? error.message : 'Failed to fetch nodes';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesNodeRecordDTO[],
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
			data: InframonitoringtypesNodeRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listNodes(
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
					error instanceof Error ? error.message : 'Failed to fetch node';
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
			<K8sBaseList<InframonitoringtypesNodeRecordDTO>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.NODES}
				tableColumns={k8sNodesColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sNodeRowKey}
				getItemKey={getK8sNodeItemKey}
				eventCategory={InfraMonitoringEvents.Node}
			/>

			<K8sBaseDetails<InframonitoringtypesNodeRecordDTO>
				category={InfraMonitoringEntity.NODES}
				eventCategory={InfraMonitoringEvents.Node}
				getSelectedItemExpression={k8sNodeGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sNodeGetEntityName}
				getInitialLogTracesExpression={k8sNodeInitialLogTracesExpression}
				getInitialEventsExpression={k8sNodeInitialEventsExpression}
				metadataConfig={k8sNodeDetailsMetadataConfig}
				entityWidgetInfo={nodeWidgetInfo}
				getEntityQueryPayload={getNodeMetricsQueryPayload}
				queryKeyPrefix="node"
			/>
		</>
	);
}

export default K8sNodesList;

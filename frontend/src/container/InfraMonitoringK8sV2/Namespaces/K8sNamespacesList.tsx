import { useCallback } from 'react';
import { listNamespaces } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesNamespaceRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	getNamespaceMetricsQueryPayload,
	k8sNamespaceDetailsMetadataConfig,
	k8sNamespaceGetEntityName,
	k8sNamespaceGetSelectedItemExpression,
	k8sNamespaceInitialEventsExpression,
	k8sNamespaceInitialLogTracesExpression,
	namespaceWidgetInfo,
} from './constants';
import {
	getK8sNamespaceItemKey,
	getK8sNamespaceRowKey,
	k8sNamespacesColumnsConfig,
} from './table.config';

function K8sNamespacesList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listNamespaces(
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
					error instanceof Error ? error.message : 'Failed to fetch namespaces';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesNamespaceRecordDTO[],
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
			data: InframonitoringtypesNamespaceRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listNamespaces(
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
					error instanceof Error ? error.message : 'Failed to fetch namespace';
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
			<K8sBaseList<InframonitoringtypesNamespaceRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.NAMESPACES}
				tableColumns={k8sNamespacesColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sNamespaceRowKey}
				getItemKey={getK8sNamespaceItemKey}
				eventCategory={InfraMonitoringEvents.Namespace}
			/>

			<K8sBaseDetails<InframonitoringtypesNamespaceRecordDTO>
				category={InfraMonitoringEntity.NAMESPACES}
				eventCategory={InfraMonitoringEvents.Namespace}
				getSelectedItemExpression={k8sNamespaceGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sNamespaceGetEntityName}
				getInitialLogTracesExpression={k8sNamespaceInitialLogTracesExpression}
				getInitialEventsExpression={k8sNamespaceInitialEventsExpression}
				metadataConfig={k8sNamespaceDetailsMetadataConfig}
				entityWidgetInfo={namespaceWidgetInfo}
				getEntityQueryPayload={getNamespaceMetricsQueryPayload}
				queryKeyPrefix="namespace"
			/>
		</>
	);
}

export default K8sNamespacesList;

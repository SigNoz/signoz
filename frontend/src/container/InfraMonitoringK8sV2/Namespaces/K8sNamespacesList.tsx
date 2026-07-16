import { useCallback, useMemo } from 'react';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listNamespaces } from 'api/generated/services/inframonitoring';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import {
	InframonitoringtypesNamespaceRecordDTO,
	InframonitoringtypesResponseTypeDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { InfraMonitoringEvents } from 'constants/events';
import APIError from 'types/api/error';

import K8sBaseDetails, { K8sDetailsFilters } from '../Base/K8sBaseDetails';
import { K8sBaseList } from '../Base/K8sBaseList';
import { K8sBaseFilters } from '../Base/types';
import { InfraMonitoringEntity } from '../constants';
import { SelectedItemParams } from '../hooks';
import {
	getNamespaceMetricsQueryPayload,
	getNamespacePodMetricsQueryPayload,
	k8sNamespaceDetailsCountsConfig,
	k8sNamespaceDetailsMetadataConfig,
	k8sNamespaceGetCountsFilterExpression,
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
import { createPodMetricsTab } from 'container/InfraMonitoringK8sV2/EntityDetailsUtils/createPodMetricsTab';

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
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesNamespaceRecordDTO[],
					total: 0,
					error:
						convertToApiError(error as AxiosError<RenderErrorResponseDTO>) ?? null,
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
			error?: APIError | null;
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
				return {
					data: null,
					error:
						convertToApiError(error as AxiosError<RenderErrorResponseDTO>) ?? null,
				};
			}
		},
		[],
	);

	const customTabs = useMemo(
		() => [
			createPodMetricsTab<InframonitoringtypesNamespaceRecordDTO>({
				getQueryPayload: getNamespacePodMetricsQueryPayload,
				category: InfraMonitoringEntity.NAMESPACES,
				queryKey: 'namespacePodMetrics',
			}),
		],
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
				detailsQueryKeyPrefix="namespace"
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
				countsConfig={k8sNamespaceDetailsCountsConfig}
				getCountsFilterExpression={k8sNamespaceGetCountsFilterExpression}
				entityWidgetInfo={namespaceWidgetInfo}
				getEntityQueryPayload={getNamespaceMetricsQueryPayload}
				queryKeyPrefix="namespace"
				customTabs={customTabs}
			/>
		</>
	);
}

export default K8sNamespacesList;

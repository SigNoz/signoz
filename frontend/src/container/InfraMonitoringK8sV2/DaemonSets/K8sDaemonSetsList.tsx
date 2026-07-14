import { useCallback } from 'react';
import { listDaemonSets } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesDaemonSetRecordDTO,
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
	daemonSetWidgetInfo,
	getDaemonSetMetricsQueryPayload,
	k8sDaemonSetDetailsMetadataConfig,
	k8sDaemonSetGetEntityName,
	k8sDaemonSetGetSelectedItemExpression,
	k8sDaemonSetInitialEventsExpression,
	k8sDaemonSetInitialLogTracesExpression,
} from './constants';
import {
	getK8sDaemonSetItemKey,
	getK8sDaemonSetRowKey,
	k8sDaemonSetsColumnsConfig,
} from './table.config';
function K8sDaemonSetsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listDaemonSets(
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
					error instanceof Error ? error.message : 'Failed to fetch daemonsets';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesDaemonSetRecordDTO[],
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
			data: InframonitoringtypesDaemonSetRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listDaemonSets(
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
					error instanceof Error ? error.message : 'Failed to fetch daemonset';
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
			<K8sBaseList<InframonitoringtypesDaemonSetRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.DAEMONSETS}
				tableColumns={k8sDaemonSetsColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sDaemonSetRowKey}
				getItemKey={getK8sDaemonSetItemKey}
				eventCategory={InfraMonitoringEvents.DaemonSet}
			/>
			<K8sBaseDetails<InframonitoringtypesDaemonSetRecordDTO>
				category={InfraMonitoringEntity.DAEMONSETS}
				eventCategory={InfraMonitoringEvents.DaemonSet}
				getSelectedItemExpression={k8sDaemonSetGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sDaemonSetGetEntityName}
				getInitialLogTracesExpression={k8sDaemonSetInitialLogTracesExpression}
				getInitialEventsExpression={k8sDaemonSetInitialEventsExpression}
				metadataConfig={k8sDaemonSetDetailsMetadataConfig}
				entityWidgetInfo={daemonSetWidgetInfo}
				getEntityQueryPayload={getDaemonSetMetricsQueryPayload}
				queryKeyPrefix="daemonset"
			/>
		</>
	);
}
export default K8sDaemonSetsList;

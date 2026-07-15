import { useCallback } from 'react';
import { listJobs } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesJobRecordDTO,
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
	getJobMetricsQueryPayload,
	jobWidgetInfo,
	k8sJobDetailsMetadataConfig,
	k8sJobGetEntityName,
	k8sJobGetSelectedItemExpression,
	k8sJobInitialEventsExpression,
	k8sJobInitialLogTracesExpression,
} from './constants';
import {
	getK8sJobItemKey,
	getK8sJobRowKey,
	k8sJobsColumnsConfig,
} from './table.config';

function K8sJobsList({
	controlListPrefix,
}: {
	controlListPrefix?: React.ReactNode;
}): JSX.Element {
	const fetchListData = useCallback(
		async (filters: K8sBaseFilters, signal?: AbortSignal) => {
			try {
				const response = await listJobs(
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
					error instanceof Error ? error.message : 'Failed to fetch jobs';
				return {
					type: 'list' as const,
					records: [] as InframonitoringtypesJobRecordDTO[],
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
			data: InframonitoringtypesJobRecordDTO | null;
			error?: string | null;
		}> => {
			try {
				const response = await listJobs(
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
					error instanceof Error ? error.message : 'Failed to fetch job';
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
			<K8sBaseList<InframonitoringtypesJobRecordDTO, SelectedItemParams>
				controlListPrefix={controlListPrefix}
				entity={InfraMonitoringEntity.JOBS}
				tableColumns={k8sJobsColumnsConfig}
				fetchListData={fetchListData}
				getRowKey={getK8sJobRowKey}
				getItemKey={getK8sJobItemKey}
				eventCategory={InfraMonitoringEvents.Job}
			/>

			<K8sBaseDetails<InframonitoringtypesJobRecordDTO>
				category={InfraMonitoringEntity.JOBS}
				eventCategory={InfraMonitoringEvents.Job}
				getSelectedItemExpression={k8sJobGetSelectedItemExpression}
				fetchEntityData={fetchEntityData}
				getEntityName={k8sJobGetEntityName}
				getInitialLogTracesExpression={k8sJobInitialLogTracesExpression}
				getInitialEventsExpression={k8sJobInitialEventsExpression}
				metadataConfig={k8sJobDetailsMetadataConfig}
				entityWidgetInfo={jobWidgetInfo}
				getEntityQueryPayload={getJobMetricsQueryPayload}
				queryKeyPrefix="job"
			/>
		</>
	);
}

export default K8sJobsList;

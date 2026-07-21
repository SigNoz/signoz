import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { listVolumes } from 'api/generated/services/inframonitoring';
import {
	InframonitoringtypesResponseTypeDTO,
	InframonitoringtypesVolumeRecordDTO,
	Querybuildertypesv5OrderDirectionDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { InfraMonitoringEvents } from 'constants/events';

import { K8sEntityConfig } from '../Base/entity.config.types';
import { K8sBaseFilters, K8sDetailsFilters } from '../Base/types';
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

async function fetchListData(
	filters: K8sBaseFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<
		InframonitoringtypesVolumeRecordDTO,
		SelectedItemParams
	>['list']['fetchListData']
> {
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
		return {
			type: 'list' as const,
			records: [] as InframonitoringtypesVolumeRecordDTO[],
			total: 0,
			error:
				convertToApiError(error as AxiosError<RenderErrorResponseDTO>) ?? null,
		};
	}
}

async function fetchEntityData(
	filters: K8sDetailsFilters,
	signal?: AbortSignal,
): ReturnType<
	K8sEntityConfig<InframonitoringtypesVolumeRecordDTO>['details']['fetchEntityData']
> {
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
		return {
			data: null,
			error:
				convertToApiError(error as AxiosError<RenderErrorResponseDTO>) ?? null,
		};
	}
}

export const volumeEntityConfig: K8sEntityConfig<
	InframonitoringtypesVolumeRecordDTO,
	SelectedItemParams
> = {
	list: {
		entity: InfraMonitoringEntity.VOLUMES,
		eventCategory: InfraMonitoringEvents.Volumes,
		tableColumns: k8sVolumesColumnsConfig,
		fetchListData,
		getRowKey: getK8sVolumeRowKey,
		getItemKey: getK8sVolumeItemKey,
		detailsQueryKeyPrefix: 'volume',
	},
	details: {
		category: InfraMonitoringEntity.VOLUMES,
		eventCategory: InfraMonitoringEvents.Volume,
		queryKeyPrefix: 'volume',
		getSelectedItemExpression: k8sVolumeGetSelectedItemExpression,
		fetchEntityData,
		getEntityName: k8sVolumeGetEntityName,
		getInitialLogTracesExpression: k8sVolumeInitialLogTracesExpression,
		getInitialEventsExpression: k8sVolumeInitialEventsExpression,
		metadataConfig: k8sVolumeDetailsMetadataConfig,
		entityWidgetInfo: volumeWidgetInfo,
		getEntityQueryPayload: getVolumeMetricsQueryPayload,
		hideDetailViewTabs: true,
	},
};

import { Color } from '@signozhq/design-tokens';
import type { BadgeColorType } from '@signozhq/ui/badge';
import {
	InframonitoringtypesContainerCountsByReadyDTO,
	InframonitoringtypesContainerCountsByStatusDTO,
	InframonitoringtypesContainerReadyDTO,
	InframonitoringtypesContainerRecordDTO,
	InframonitoringtypesContainerStatusDTO,
} from 'api/generated/services/sigNoz.schemas';

import { StatusCountItem } from '../components/GroupedStatusCounts';
import { INFRA_MONITORING_ATTR_KEYS } from '../constants';

export const CONTAINERS_DOC_PATH =
	'/infrastructure-monitoring/kubernetes/containers';

/** Renders as `name:tag`; the tag is dropped when the image is not pinned. */
export function getContainerImageWithTag(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	const name = container.meta?.[INFRA_MONITORING_ATTR_KEYS.CONTAINER_IMAGE_NAME];
	const tag = container.meta?.[INFRA_MONITORING_ATTR_KEYS.CONTAINER_IMAGE_TAG];

	if (!name) {
		return '';
	}

	return tag ? `${name}:${tag}` : name;
}

export function getContainerName(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	return (
		container.containerName ||
		container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME] ||
		''
	);
}

export function getContainerPodUID(
	container: InframonitoringtypesContainerRecordDTO,
): string {
	return (
		container.podUID ||
		container.meta?.[INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID] ||
		''
	);
}

export const CONTAINER_STATUS_COLORS: Record<
	InframonitoringtypesContainerStatusDTO,
	BadgeColorType
> = {
	[InframonitoringtypesContainerStatusDTO.running]: 'success',
	[InframonitoringtypesContainerStatusDTO.completed]: 'primary',
	[InframonitoringtypesContainerStatusDTO.waiting]: 'warning',
	[InframonitoringtypesContainerStatusDTO.containercreating]: 'warning',
	[InframonitoringtypesContainerStatusDTO.terminated]: 'archive',
	[InframonitoringtypesContainerStatusDTO.unknown]: 'secondary',
	[InframonitoringtypesContainerStatusDTO.no_data]: 'secondary',
	[InframonitoringtypesContainerStatusDTO.crashloopbackoff]: 'danger',
	[InframonitoringtypesContainerStatusDTO.imagepullbackoff]: 'danger',
	[InframonitoringtypesContainerStatusDTO.errimagepull]: 'danger',
	[InframonitoringtypesContainerStatusDTO.createcontainerconfigerror]: 'danger',
	[InframonitoringtypesContainerStatusDTO.oomkilled]: 'danger',
	[InframonitoringtypesContainerStatusDTO.error]: 'danger',
	[InframonitoringtypesContainerStatusDTO.containercannotrun]: 'danger',
};

/** kubectl prints these as single CamelCase words, so the enum value alone is not a usable label. */
export const CONTAINER_STATUS_LABELS: Record<
	InframonitoringtypesContainerStatusDTO,
	string
> = {
	[InframonitoringtypesContainerStatusDTO.running]: 'Running',
	[InframonitoringtypesContainerStatusDTO.completed]: 'Completed',
	[InframonitoringtypesContainerStatusDTO.waiting]: 'Waiting',
	[InframonitoringtypesContainerStatusDTO.containercreating]:
		'ContainerCreating',
	[InframonitoringtypesContainerStatusDTO.terminated]: 'Terminated',
	[InframonitoringtypesContainerStatusDTO.unknown]: 'Unknown',
	[InframonitoringtypesContainerStatusDTO.no_data]: 'No data',
	[InframonitoringtypesContainerStatusDTO.crashloopbackoff]: 'CrashLoopBackOff',
	[InframonitoringtypesContainerStatusDTO.imagepullbackoff]: 'ImagePullBackOff',
	[InframonitoringtypesContainerStatusDTO.errimagepull]: 'ErrImagePull',
	[InframonitoringtypesContainerStatusDTO.createcontainerconfigerror]:
		'CreateContainerConfigError',
	[InframonitoringtypesContainerStatusDTO.oomkilled]: 'OOMKilled',
	[InframonitoringtypesContainerStatusDTO.error]: 'Error',
	[InframonitoringtypesContainerStatusDTO.containercannotrun]:
		'ContainerCannotRun',
};

const CONTAINER_ERROR_STATUS_LABELS: Partial<
	Record<keyof InframonitoringtypesContainerCountsByStatusDTO, string>
> = {
	crashLoopBackOff: 'CrashLoopBackOff',
	imagePullBackOff: 'ImagePullBackOff',
	errImagePull: 'ErrImagePull',
	createContainerConfigError: 'CreateContainerConfigError',
	oomKilled: 'OOMKilled',
	error: 'Error',
	containerCannotRun: 'ContainerCannotRun',
};

export function getContainerStatusItems(
	counts: InframonitoringtypesContainerCountsByStatusDTO,
): StatusCountItem[] {
	const errorKeys = Object.keys(CONTAINER_ERROR_STATUS_LABELS) as Array<
		keyof typeof CONTAINER_ERROR_STATUS_LABELS
	>;

	return [
		{ value: counts.running, label: 'Running', color: Color.BG_FOREST_500 },
		{ value: counts.completed, label: 'Completed', color: Color.BG_ROBIN_500 },
		{
			value: counts.waiting + counts.containerCreating,
			label: 'Waiting',
			color: Color.BG_AMBER_500,
			breakdown: [
				{ label: 'Waiting', value: counts.waiting },
				{ label: 'ContainerCreating', value: counts.containerCreating },
			],
		},
		{
			value: counts.terminated,
			label: 'Terminated',
			color: Color.BG_SIENNA_500,
		},
		{ value: counts.unknown, label: 'Unknown', color: Color.BG_SLATE_400 },
		{
			value: errorKeys.reduce((sum, key) => sum + counts[key], 0),
			label: 'Error Status',
			color: Color.BG_CHERRY_500,
			breakdown: errorKeys.map((key) => ({
				label: CONTAINER_ERROR_STATUS_LABELS[key] as string,
				value: counts[key],
			})),
		},
	];
}

export const CONTAINER_READY_COLORS: Record<
	InframonitoringtypesContainerReadyDTO,
	BadgeColorType
> = {
	[InframonitoringtypesContainerReadyDTO.ready]: 'success',
	[InframonitoringtypesContainerReadyDTO.not_ready]: 'danger',
	[InframonitoringtypesContainerReadyDTO.no_data]: 'secondary',
};

export const CONTAINER_READY_LABELS: Record<
	InframonitoringtypesContainerReadyDTO,
	string
> = {
	[InframonitoringtypesContainerReadyDTO.ready]: 'Ready',
	[InframonitoringtypesContainerReadyDTO.not_ready]: 'Not Ready',
	[InframonitoringtypesContainerReadyDTO.no_data]: 'No data',
};

export function getContainerReadyItems(
	counts: InframonitoringtypesContainerCountsByReadyDTO,
): StatusCountItem[] {
	return [
		{ value: counts.ready, label: 'Ready', color: Color.BG_FOREST_500 },
		{ value: counts.notReady, label: 'Not Ready', color: Color.BG_CHERRY_500 },
	];
}

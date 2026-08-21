import { Color } from '@signozhq/design-tokens';
import { BadgeColor } from '@signozhq/ui/badge';
import {
	InframonitoringtypesContainerCountsByReadyDTO,
	InframonitoringtypesContainerCountsByStatusDTO,
	InframonitoringtypesContainerReadyDTO,
	InframonitoringtypesContainerStatusDTO,
	InframonitoringtypesPodCountsByStatusDTO,
	InframonitoringtypesPodStatusDTO,
} from 'api/generated/services/sigNoz.schemas';

import { StatusCountItem } from './components/GroupedStatusCounts';

/**
 * Converts size in bytes to a human-readable string with appropriate units
 */
export function formatBytes(bytes: number, decimals = 2): string {
	if (Number.isNaN(bytes) || !Number.isFinite(bytes)) {
		return '-';
	}

	if (bytes === 0) {
		return '0 Bytes';
	}

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

export const POD_STATUS_COLORS: Record<
	InframonitoringtypesPodStatusDTO,
	BadgeColor
> = {
	[InframonitoringtypesPodStatusDTO.running]: 'forest',
	[InframonitoringtypesPodStatusDTO.completed]: 'robin',
	[InframonitoringtypesPodStatusDTO.pending]: 'amber',
	[InframonitoringtypesPodStatusDTO.unknown]: 'vanilla',
	[InframonitoringtypesPodStatusDTO.no_data]: 'vanilla',
	[InframonitoringtypesPodStatusDTO.failed]: 'cherry',
	[InframonitoringtypesPodStatusDTO.crashloopbackoff]: 'cherry',
	[InframonitoringtypesPodStatusDTO.imagepullbackoff]: 'cherry',
	[InframonitoringtypesPodStatusDTO.errimagepull]: 'cherry',
	[InframonitoringtypesPodStatusDTO.createcontainerconfigerror]: 'cherry',
	[InframonitoringtypesPodStatusDTO.containercreating]: 'amber',
	[InframonitoringtypesPodStatusDTO.oomkilled]: 'cherry',
	[InframonitoringtypesPodStatusDTO.error]: 'cherry',
	[InframonitoringtypesPodStatusDTO.containercannotrun]: 'cherry',
	[InframonitoringtypesPodStatusDTO.evicted]: 'cherry',
	[InframonitoringtypesPodStatusDTO.nodeaffinity]: 'cherry',
	[InframonitoringtypesPodStatusDTO.nodelost]: 'cherry',
	[InframonitoringtypesPodStatusDTO.shutdown]: 'cherry',
	[InframonitoringtypesPodStatusDTO.unexpectedadmissionerror]: 'cherry',
};

type PodStatusCategory =
	| 'running'
	| 'completed'
	| 'pending'
	| 'unknown'
	| 'error';

const POD_STATUS_CATEGORY_MAP: Record<
	keyof InframonitoringtypesPodCountsByStatusDTO,
	PodStatusCategory
> = {
	running: 'running',
	completed: 'completed',
	pending: 'pending',
	unknown: 'unknown',
	failed: 'error',
	crashLoopBackOff: 'error',
	imagePullBackOff: 'error',
	errImagePull: 'error',
	createContainerConfigError: 'error',
	containerCreating: 'error',
	oomKilled: 'error',
	error: 'error',
	containerCannotRun: 'error',
	evicted: 'error',
	nodeAffinity: 'error',
	nodeLost: 'error',
	shutdown: 'error',
	unexpectedAdmissionError: 'error',
};

type ErrorStatusKey = {
	[K in keyof InframonitoringtypesPodCountsByStatusDTO]: (typeof POD_STATUS_CATEGORY_MAP)[K] extends 'error'
		? K
		: never;
}[keyof InframonitoringtypesPodCountsByStatusDTO];

const ERROR_STATUS_LABELS: Record<ErrorStatusKey, string> = {
	failed: 'Failed',
	crashLoopBackOff: 'CrashLoopBackOff',
	imagePullBackOff: 'ImagePullBackOff',
	errImagePull: 'ErrImagePull',
	createContainerConfigError: 'CreateContainerConfigError',
	containerCreating: 'ContainerCreating',
	oomKilled: 'OOMKilled',
	error: 'Error',
	containerCannotRun: 'ContainerCannotRun',
	evicted: 'Evicted',
	nodeAffinity: 'NodeAffinity',
	nodeLost: 'NodeLost',
	shutdown: 'Shutdown',
	unexpectedAdmissionError: 'UnexpectedAdmissionError',
};

export function getPodStatusItems(
	counts: InframonitoringtypesPodCountsByStatusDTO,
): StatusCountItem[] {
	const errorKeys = Object.keys(ERROR_STATUS_LABELS) as ErrorStatusKey[];

	const errorTotal = errorKeys.reduce((sum, key) => sum + counts[key], 0);
	const errorBreakdown = errorKeys.map((key) => ({
		label: ERROR_STATUS_LABELS[key],
		value: counts[key],
	}));

	return [
		{ value: counts.running, label: 'Running', color: Color.BG_FOREST_500 },
		{ value: counts.completed, label: 'Completed', color: Color.BG_ROBIN_500 },
		{ value: counts.pending, label: 'Pending', color: Color.BG_AMBER_500 },
		{ value: counts.unknown, label: 'Unknown', color: Color.BG_SLATE_400 },
		{
			value: errorTotal,
			label: 'Error Status',
			color: Color.BG_CHERRY_500,
			breakdown: errorBreakdown,
		},
	];
}

export const CONTAINER_STATUS_COLORS: Record<
	InframonitoringtypesContainerStatusDTO,
	BadgeColor
> = {
	[InframonitoringtypesContainerStatusDTO.running]: 'forest',
	[InframonitoringtypesContainerStatusDTO.completed]: 'robin',
	[InframonitoringtypesContainerStatusDTO.waiting]: 'amber',
	[InframonitoringtypesContainerStatusDTO.containercreating]: 'amber',
	[InframonitoringtypesContainerStatusDTO.terminated]: 'sienna',
	[InframonitoringtypesContainerStatusDTO.unknown]: 'vanilla',
	[InframonitoringtypesContainerStatusDTO.no_data]: 'vanilla',
	[InframonitoringtypesContainerStatusDTO.crashloopbackoff]: 'cherry',
	[InframonitoringtypesContainerStatusDTO.imagepullbackoff]: 'cherry',
	[InframonitoringtypesContainerStatusDTO.errimagepull]: 'cherry',
	[InframonitoringtypesContainerStatusDTO.createcontainerconfigerror]: 'cherry',
	[InframonitoringtypesContainerStatusDTO.oomkilled]: 'cherry',
	[InframonitoringtypesContainerStatusDTO.error]: 'cherry',
	[InframonitoringtypesContainerStatusDTO.containercannotrun]: 'cherry',
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
	BadgeColor
> = {
	[InframonitoringtypesContainerReadyDTO.ready]: 'forest',
	[InframonitoringtypesContainerReadyDTO.not_ready]: 'cherry',
	[InframonitoringtypesContainerReadyDTO.no_data]: 'vanilla',
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

import { Color } from '@signozhq/design-tokens';
import { BadgeColor } from '@signozhq/ui/badge';
import {
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

/**
 * Returns stroke color for request utilization parameters according to current value
 */
export function getStrokeColorForRequestUtilization(value: number): string {
	const percent = Number((value * 100).toFixed(1));
	// Orange
	if (percent <= 50) {
		return Color.BG_AMBER_500;
	}
	// Green
	if (percent > 50 && percent <= 100) {
		return Color.BG_FOREST_500;
	}
	// Regular Red
	if (percent > 100 && percent <= 150) {
		return Color.BG_SAKURA_500;
	}
	// Dark Red
	return Color.BG_CHERRY_600;
}

/**
 * Returns stroke color for limit utilization parameters according to current value
 */
export function getStrokeColorForLimitUtilization(value: number): string {
	const percent = Number((value * 100).toFixed(1));
	// Green
	if (percent <= 60) {
		return Color.BG_FOREST_500;
	}
	// Yellow
	if (percent > 60 && percent <= 80) {
		return Color.BG_AMBER_200;
	}
	// Orange
	if (percent > 80 && percent <= 95) {
		return Color.BG_AMBER_500;
	}
	// Red
	return Color.BG_SAKURA_500;
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

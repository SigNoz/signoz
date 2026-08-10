import { Color } from '@signozhq/design-tokens';

export type EntityProgressBarType =
	| 'cpu-request'
	| 'cpu-limit'
	| 'memory-request'
	| 'memory-limit'
	| 'cpu'
	| 'memory'
	| 'disk';

export interface EntityProgressThreshold {
	matches: (percent: number) => boolean;
	color: string;
	range: string;
	label: string;
	description: string;
}

const CPU_REQUEST_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent <= 50,
		color: Color.BG_AMBER_500,
		range: '≤ 50%',
		label: 'Over-requested',
		description:
			'CPU usage is at most half of the request. The rest of the request stays reserved on the node.',
	},
	{
		matches: (percent): boolean => percent <= 100,
		color: Color.BG_FOREST_500,
		range: '> 50% - 100%',
		label: 'Right-sized',
		description: 'CPU usage is close to the request and stays within it.',
	},
	{
		matches: (percent): boolean => percent <= 150,
		color: Color.BG_SAKURA_500,
		range: '> 100% - 150%',
		label: 'Over request',
		description:
			'CPU usage is above the request. The extra CPU is not guaranteed and depends on spare node capacity.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_CHERRY_600,
		range: '> 150%',
		label: 'Request badly undersized',
		description:
			'CPU usage is more than 1.5x the request, so most of the CPU in use is not guaranteed.',
	},
];

const CPU_LIMIT_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent <= 60,
		color: Color.BG_FOREST_500,
		range: '≤ 60%',
		label: 'Healthy',
		description: 'CPU usage is well below the limit.',
	},
	{
		matches: (percent): boolean => percent <= 80,
		color: Color.BG_AMBER_200,
		range: '> 60% - 80%',
		label: 'Watch',
		description: 'CPU usage is approaching the limit.',
	},
	{
		matches: (percent): boolean => percent <= 95,
		color: Color.BG_AMBER_500,
		range: '> 80% - 95%',
		label: 'Near limit',
		description:
			'CPU usage is close to the limit. Usage above the limit is throttled.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_SAKURA_500,
		range: '> 95%',
		label: 'At limit',
		description:
			'CPU usage is at the limit, so the container is likely being throttled.',
	},
];

const MEMORY_REQUEST_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent <= 50,
		color: Color.BG_AMBER_500,
		range: '≤ 50%',
		label: 'Over-requested',
		description:
			'Memory usage is at most half of the request. The rest of the request stays reserved on the node.',
	},
	{
		matches: (percent): boolean => percent <= 100,
		color: Color.BG_FOREST_500,
		range: '> 50% - 100%',
		label: 'Right-sized',
		description: 'Memory usage is close to the request and stays within it.',
	},
	{
		matches: (percent): boolean => percent <= 150,
		color: Color.BG_SAKURA_500,
		range: '> 100% - 150%',
		label: 'Over request',
		description:
			'Memory usage is above the request. The extra memory is not guaranteed and is reclaimed first under node memory pressure.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_CHERRY_600,
		range: '> 150%',
		label: 'Request badly undersized',
		description:
			'Memory usage is more than 1.5x the request, so most of the memory in use is not guaranteed.',
	},
];

const MEMORY_LIMIT_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent <= 60,
		color: Color.BG_FOREST_500,
		range: '≤ 60%',
		label: 'Healthy',
		description: 'Memory usage is well below the limit.',
	},
	{
		matches: (percent): boolean => percent <= 80,
		color: Color.BG_AMBER_200,
		range: '> 60% - 80%',
		label: 'Watch',
		description: 'Memory usage is approaching the limit.',
	},
	{
		matches: (percent): boolean => percent <= 95,
		color: Color.BG_AMBER_500,
		range: '> 80% - 95%',
		label: 'Near limit',
		description:
			'Memory usage is close to the limit. Unlike CPU, memory is not throttled: reaching the limit ends in an OOM kill.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_SAKURA_500,
		range: '> 95%',
		label: 'At limit',
		description:
			'Memory usage is at the limit, so an OOM kill and container restart are likely.',
	},
];

const CPU_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent < 60,
		color: Color.BG_FOREST_500,
		range: '< 60%',
		label: 'Healthy',
		description: 'CPU usage is well below the available capacity.',
	},
	{
		matches: (percent): boolean => percent < 90,
		color: Color.BG_AMBER_500,
		range: '60% - 89.9%',
		label: 'Elevated',
		description: 'CPU usage is high relative to the available capacity.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_SAKURA_500,
		range: '≥ 90%',
		label: 'Critical',
		description: 'CPU usage is close to the available capacity.',
	},
];

const MEMORY_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent < 60,
		color: Color.BG_FOREST_500,
		range: '< 60%',
		label: 'Healthy',
		description: 'Memory usage is well below the available capacity.',
	},
	{
		matches: (percent): boolean => percent < 90,
		color: Color.BG_AMBER_500,
		range: '60% - 89.9%',
		label: 'Elevated',
		description: 'Memory usage is high relative to the available capacity.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_CHERRY_500,
		range: '≥ 90%',
		label: 'Critical',
		description:
			'Memory usage is close to the available capacity. Unlike CPU, memory is not throttled: running out ends in an OOM kill.',
	},
];

const DISK_THRESHOLDS: EntityProgressThreshold[] = [
	{
		matches: (percent): boolean => percent < 60,
		color: Color.BG_FOREST_500,
		range: '< 60%',
		label: 'Healthy',
		description: 'Most of the volume is still free.',
	},
	{
		matches: (percent): boolean => percent < 90,
		color: Color.BG_AMBER_500,
		range: '60% - 89.9%',
		label: 'Elevated',
		description: 'Used space is high relative to the volume capacity.',
	},
	{
		matches: (): boolean => true,
		color: Color.BG_SAKURA_500,
		range: '≥ 90%',
		label: 'Critical',
		description: 'The volume is nearly full. Writes fail once no space is left.',
	},
];

export const THRESHOLDS_BY_TYPE: Record<
	EntityProgressBarType,
	EntityProgressThreshold[]
> = {
	'cpu-request': CPU_REQUEST_THRESHOLDS,
	'cpu-limit': CPU_LIMIT_THRESHOLDS,
	'memory-request': MEMORY_REQUEST_THRESHOLDS,
	'memory-limit': MEMORY_LIMIT_THRESHOLDS,
	cpu: CPU_THRESHOLDS,
	memory: MEMORY_THRESHOLDS,
	disk: DISK_THRESHOLDS,
};

export function getStrokeColorForPercent(
	type: EntityProgressBarType,
	percent: number,
): string {
	const thresholds = THRESHOLDS_BY_TYPE[type];
	const match = thresholds.find((threshold) => threshold.matches(percent));
	return (match ?? thresholds[thresholds.length - 1]).color;
}

export function getStrokeColor(
	type: EntityProgressBarType,
	value: number,
): string {
	return getStrokeColorForPercent(type, Number((value * 100).toFixed(1)));
}

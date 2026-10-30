import type { UpdatedWindow } from '../dsl/types';

const UPDATED_LABELS: Record<UpdatedWindow, string> = {
	any: 'Any time',
	today: 'Today',
	'7d': 'Last 7 days',
	'30d': 'Last 30 days',
};

const UPDATED_WINDOWS: UpdatedWindow[] = ['any', 'today', '7d', '30d'];

export const UPDATED_OPTIONS = UPDATED_WINDOWS.map((w) => ({
	value: w,
	label: UPDATED_LABELS[w],
}));

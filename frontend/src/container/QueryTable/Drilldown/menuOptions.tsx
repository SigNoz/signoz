import { OPERATORS } from 'constants/queryBuilder';
import { BarChart2, ChartBar, DraftingCompass, ScrollText } from 'lucide-react';

/**
 * Supported operators for filtering with their display properties
 */
export const SUPPORTED_OPERATORS = {
	[OPERATORS['=']]: {
		label: 'Is this',
		icon: '=',
		value: '=',
	},
	[OPERATORS['!=']]: {
		label: 'Is not this',
		icon: '!=',
		value: '!=',
	},
	[OPERATORS['>=']]: {
		label: 'Is greater than or equal to',
		icon: '>=',
		value: '>=',
	},
	[OPERATORS['<=']]: {
		label: 'Is less than or equal to',
		icon: '<=',
		value: '<=',
	},
	[OPERATORS['<']]: {
		label: 'Is less than',
		icon: '<',
		value: '<',
	},
};

/**
 * Aggregate menu options for different views
 */
export const AGGREGATE_OPTIONS = [
	{
		key: 'view_logs',
		icon: <ScrollText size={16} />,
		label: 'View in Logs',
	},
	{
		key: 'view_metrics',
		icon: <BarChart2 size={16} />,
		label: 'View in Metrics',
	},
	{
		key: 'view_traces',
		icon: <DraftingCompass size={16} />,
		label: 'View in Traces',
	},
	{
		key: 'breakout',
		icon: <ChartBar size={16} />,
		label: 'Breakout by ..',
	},
];

import { OPERATORS } from 'constants/queryBuilder';
import { Braces, ChartBar, DraftingCompass, ScrollText } from 'lucide-react';

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
// TO REMOVE
export const AGGREGATE_OPTIONS = [
	{
		key: 'view_logs',
		icon: <ScrollText size={16} />,
		label: 'View in Logs',
	},
	// {
	// 	key: 'view_metrics',
	// 	icon: <BarChart2 size={16} />,
	// 	label: 'View in Metrics',
	// },
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

/**
 * Aggregate menu options for different views
 */
export const getBaseContextConfig = ({
	handleBaseDrilldown,
	setSubMenu,
	showDashboardVariablesOption,
	showBreakoutOption,
}: {
	handleBaseDrilldown: (key: string) => void;
	setSubMenu: (subMenu: string) => void;
	showDashboardVariablesOption: boolean;
	showBreakoutOption: boolean;
}): {
	key: string;
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	hidden?: boolean;
}[] => [
	{
		key: 'dashboard_variables',
		icon: <Braces size={16} />,
		label: 'Dashboard Variables',
		onClick: (): void => setSubMenu('dashboard_variables'),
		hidden: !showDashboardVariablesOption,
	},
	{
		key: 'view_logs',
		icon: <ScrollText size={16} />,
		label: 'View in Logs',
		onClick: (): void => handleBaseDrilldown('view_logs'),
	},
	// {
	// 	key: 'view_metrics',
	// 	icon: <BarChart2 size={16} />,
	// 	label: 'View in Metrics',
	// 	onClick: () => handleBaseDrilldown('view_metrics'),
	// },
	{
		key: 'view_traces',
		icon: <DraftingCompass size={16} />,
		label: 'View in Traces',
		onClick: (): void => handleBaseDrilldown('view_traces'),
	},
	{
		key: 'breakout',
		icon: <ChartBar size={16} />,
		label: 'Breakout by ..',
		onClick: (): void => setSubMenu('breakout'),
		hidden: !showBreakoutOption,
	},
];

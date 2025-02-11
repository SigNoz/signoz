import { Color } from '@signozhq/design-tokens';
import { PANEL_TYPES, ValuePanelVisibleOption } from 'constants/queryBuilder';
import {
	BarChart3,
	LineChart,
	List,
	PieChart,
	SigmaSquare,
	Table,
} from 'lucide-react';

const Items: ItemsProps[] = [
	{
		name: PANEL_TYPES.TIME_SERIES,
		icon: <LineChart size={16} color={Color.BG_ROBIN_400} />,
		display: 'Time Series',
	},
	{
		name: PANEL_TYPES.VALUE,
		icon: <SigmaSquare size={16} color={Color.BG_ROBIN_400} />,
		display: ValuePanelVisibleOption,
	},
	{
		name: PANEL_TYPES.TABLE,
		icon: <Table size={16} color={Color.BG_ROBIN_400} />,
		display: 'Table',
	},
	{
		name: PANEL_TYPES.LIST,
		icon: <List size={16} color={Color.BG_ROBIN_400} />,
		display: 'List',
	},
	{
		name: PANEL_TYPES.BAR,
		icon: <BarChart3 size={16} color={Color.BG_ROBIN_400} />,
		display: 'Bar',
	},
	{
		name: PANEL_TYPES.PIE,
		icon: <PieChart size={16} color={Color.BG_ROBIN_400} />,
		display: 'Pie',
	},
	{
		name: PANEL_TYPES.HISTOGRAM,
		icon: <BarChart3 size={16} color={Color.BG_ROBIN_400} />,
		display: 'Histogram',
	},
];

export interface ItemsProps {
	name: PANEL_TYPES;
	icon: JSX.Element;
	display: string;
}

export default Items;

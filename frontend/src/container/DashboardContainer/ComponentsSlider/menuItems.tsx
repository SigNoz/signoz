import { Color } from '@signozhq/design-tokens';
import { PANEL_TYPES, PanelDisplay } from 'constants/queryBuilder';
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
		display: PanelDisplay.TIME_SERIES,
	},
	{
		name: PANEL_TYPES.VALUE,
		icon: <SigmaSquare size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.VALUE,
	},
	{
		name: PANEL_TYPES.TABLE,
		icon: <Table size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.TABLE,
	},
	{
		name: PANEL_TYPES.LIST,
		icon: <List size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.LIST,
	},
	{
		name: PANEL_TYPES.BAR,
		icon: <BarChart3 size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.BAR,
	},
	{
		name: PANEL_TYPES.PIE,
		icon: <PieChart size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.PIE,
	},
	{
		name: PANEL_TYPES.HISTOGRAM,
		icon: <BarChart3 size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.HISTOGRAM,
	},
];

export interface ItemsProps {
	name: PANEL_TYPES;
	icon: JSX.Element;
	display: string;
}

export default Items;

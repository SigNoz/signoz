import { Color } from '@signozhq/design-tokens';
import { PANEL_TYPES, PanelDisplay } from 'constants/queryBuilder';
import {
	BarChart,
	ChartLine,
	ChartPie,
	List,
	SquareSigma,
	Table,
} from '@signozhq/icons';

export const PanelTypesWithData: ItemsProps[] = [
	{
		name: PANEL_TYPES.TIME_SERIES,
		icon: <ChartLine size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.TIME_SERIES,
	},
	{
		name: PANEL_TYPES.VALUE,
		icon: <SquareSigma size={16} color={Color.BG_ROBIN_400} />,
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
		icon: <BarChart size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.BAR,
	},
	{
		name: PANEL_TYPES.PIE,
		icon: <ChartPie size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.PIE,
	},
	{
		name: PANEL_TYPES.HISTOGRAM,
		icon: <BarChart size={16} color={Color.BG_ROBIN_400} />,
		display: PanelDisplay.HISTOGRAM,
	},
];

export interface ItemsProps {
	name: PANEL_TYPES;
	icon: JSX.Element;
	display: string;
}

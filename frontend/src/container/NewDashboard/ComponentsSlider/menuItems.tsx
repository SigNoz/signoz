import { Color } from '@signozhq/design-tokens';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { LineChart, SigmaSquare, Table } from 'lucide-react';

const Items: ItemsProps[] = [
	{
		name: PANEL_TYPES.TIME_SERIES,
		icon: <LineChart size={32} color={Color.BG_ROBIN_400} />,
		display: 'Time Series',
	},
	{
		name: PANEL_TYPES.VALUE,
		icon: <SigmaSquare size={32} color={Color.BG_ROBIN_400} />,
		display: 'Value',
	},
	{
		name: PANEL_TYPES.TABLE,
		icon: <Table size={32} color={Color.BG_ROBIN_400} />,
		display: 'Table',
	},
];

interface ItemsProps {
	name: PANEL_TYPES;
	icon: JSX.Element;
	display: string;
}

export default Items;

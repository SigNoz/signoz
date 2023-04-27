import TimeSeries from 'assets/Dashboard/TimeSeries';
import ValueIcon from 'assets/Dashboard/Value';
import { PANEL_TYPES } from 'constants/queryBuilder';

const Items: ItemsProps[] = [
	{
		name: PANEL_TYPES.TIME_SERIES,
		Icon: TimeSeries,
		display: 'Time Series',
	},
	{
		name: PANEL_TYPES.VALUE,
		Icon: ValueIcon,
		display: 'Value',
	},
];

export type ITEMS = 'graph' | 'value' | 'list' | 'table' | 'EMPTY_WIDGET';

interface ItemsProps {
	name: ITEMS;
	Icon: (props: IconProps) => JSX.Element;
	display: string;
}

interface IconProps {
	fillColor: React.CSSProperties['color'];
}

export default Items;

import TimeSeries from 'assets/Dashboard/TimeSeries';
import ValueIcon from 'assets/Dashboard/Value';

const Items: ItemsProps[] = [
	{
		name: 'graph',
		Icon: TimeSeries,
		display: 'Time Series',
	},
	{
		name: 'value',
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

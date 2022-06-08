import TimeSeries from 'assets/Dashboard/TimeSeries';
import ValueIcon from 'assets/Dashboard/Value';

const Items: ItemsProps[] = [
	{
		name: 'TIME_SERIES',
		Icon: TimeSeries,
		display: 'Time Series',
	},
	{
		name: 'VALUE',
		Icon: ValueIcon,
		display: 'Value',
	},
];

export type ITEMS = 'TIME_SERIES' | 'VALUE' | 'EMPTY_WIDGET';

interface ItemsProps {
	name: ITEMS;
	Icon: (props: IconProps) => JSX.Element;
	display: string;
}

interface IconProps {
	fillColor: React.CSSProperties['color'];
}

export default Items;

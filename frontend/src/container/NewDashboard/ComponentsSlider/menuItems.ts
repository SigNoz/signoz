import TimeSeries from 'assets/Dashboard/TimeSeries';
import ValueIcon from 'assets/Dashboard/Value';

const Items: ItemsProps[] = [
	{
		name: 'Time Series',
		Icon: TimeSeries,
	},
	{
		name: 'Value',
		Icon: ValueIcon,
	},
];

export type ITEMS = 'Time Series' | 'Value';

interface ItemsProps {
	name: ITEMS;
	Icon: () => JSX.Element;
}

export default Items;

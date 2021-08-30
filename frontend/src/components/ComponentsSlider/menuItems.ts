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

interface ItemsProps {
	name: string;
	Icon: () => JSX.Element;
}

export default Items;

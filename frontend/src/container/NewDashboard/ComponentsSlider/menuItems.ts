import TableIcon from 'assets/Dashboard/Table';
import TimeSeriesIcon from 'assets/Dashboard/TimeSeries';
import ValueIcon from 'assets/Dashboard/Value';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { CSSProperties } from 'react';

const Items: ItemsProps[] = [
	{
		name: PANEL_TYPES.TIME_SERIES,
		Icon: TimeSeriesIcon,
		display: 'Time Series',
	},
	{
		name: PANEL_TYPES.VALUE,
		Icon: ValueIcon,
		display: 'Value',
	},
	{ name: PANEL_TYPES.TABLE, Icon: TableIcon, display: 'Table' },
];

interface ItemsProps {
	name: PANEL_TYPES;
	Icon: (props: IconProps) => JSX.Element;
	display: string;
}

interface IconProps {
	fillColor: CSSProperties['color'];
}

export default Items;

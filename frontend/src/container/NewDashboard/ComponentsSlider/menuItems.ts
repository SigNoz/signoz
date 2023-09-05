import AreaGraphIcon from 'assets/Dashboard/AreaGraph';
import TableIcon from 'assets/Dashboard/Table';
import TimeSeriesIcon from 'assets/Dashboard/TimeSeries';
import ValueIcon from 'assets/Dashboard/Value';
import { DISPLAY_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { CSSProperties } from 'react';

const Items: ItemsProps[] = [
	{
		name: PANEL_TYPES.TIME_SERIES,
		Icon: TimeSeriesIcon,
		display: DISPLAY_TYPES.TIME_SERIES,
	},
	{
		name: PANEL_TYPES.VALUE,
		Icon: ValueIcon,
		display: DISPLAY_TYPES.VALUE,
	},
	{
		name: PANEL_TYPES.TABLE,
		Icon: TableIcon,
		display: DISPLAY_TYPES.TABLE,
	},
	{
		name: PANEL_TYPES.TIME_SERIES,
		Icon: AreaGraphIcon,
		display: DISPLAY_TYPES.AREA,
	},
];

interface ItemsProps {
	name: PANEL_TYPES;
	Icon: (props: IconProps) => JSX.Element;
	display: DISPLAY_TYPES;
}

interface IconProps {
	fillColor: CSSProperties['color'];
}

export default Items;

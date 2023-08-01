import { ChartData } from 'chart.js';
import {
	GraphOnClickHandler,
	GraphProps,
	StaticLineProps,
} from 'components/Graph';
import { GridTableComponentProps } from 'container/GridTableComponent/types';
import { GridValueComponentProps } from 'container/GridValueComponent/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

import { PANEL_TYPES } from '../../constants/queryBuilder';

export type GridPanelSwitchProps = {
	panelType: PANEL_TYPES;
	data: ChartData;
	title?: string;
	opacity?: string;
	isStacked?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	staticLine?: StaticLineProps;
	onDragSelect?: (start: number, end: number) => void;
	panelData: QueryDataV3[];
	query: Query;
};

export type PropsTypePropsMap = {
	[PANEL_TYPES.TIME_SERIES]: GraphProps;
	[PANEL_TYPES.VALUE]: GridValueComponentProps;
	[PANEL_TYPES.TABLE]: GridTableComponentProps;
	[PANEL_TYPES.TRACE]: null;
	[PANEL_TYPES.LIST]: null;
	[PANEL_TYPES.EMPTY_WIDGET]: null;
};

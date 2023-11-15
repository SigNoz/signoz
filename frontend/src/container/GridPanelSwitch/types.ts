import { StaticLineProps, ToggleGraphProps } from 'components/Graph/types';
import { UplotProps } from 'components/Uplot/Uplot';
import { GridTableComponentProps } from 'container/GridTableComponent/types';
import { GridValueComponentProps } from 'container/GridValueComponent/types';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { ForwardedRef } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';
import uPlot from 'uplot';

import { PANEL_TYPES } from '../../constants/queryBuilder';

export type GridPanelSwitchProps = {
	panelType: PANEL_TYPES;
	data: uPlot.AlignedData;
	options: uPlot.Options;
	onClickHandler?: OnClickPluginOpts['onClick'];
	name: string;
	yAxisUnit?: string;
	staticLine?: StaticLineProps;
	onDragSelect?: (start: number, end: number) => void;
	panelData: QueryDataV3[];
	query: Query;
	thresholds?: Widgets['thresholds'];
};

export type PropsTypePropsMap = {
	[PANEL_TYPES.TIME_SERIES]: UplotProps & {
		ref: ForwardedRef<ToggleGraphProps | undefined>;
	};
	[PANEL_TYPES.VALUE]: GridValueComponentProps;
	[PANEL_TYPES.TABLE]: GridTableComponentProps;
	[PANEL_TYPES.TRACE]: null;
	[PANEL_TYPES.LIST]: null;
	[PANEL_TYPES.EMPTY_WIDGET]: null;
};

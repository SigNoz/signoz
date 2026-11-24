import { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { ToggleGraphProps } from 'components/Graph/types';
import { UplotProps } from 'components/Uplot/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { Widgets } from 'types/api/widgets/widget';
import uPlot from 'uplot';

export interface LegendEntryProps {
	label: string;
	show: boolean;
}

export type PanelTypeAndGraphManagerVisibilityProps = Record<
	keyof typeof PANEL_TYPES,
	boolean
>;

export interface FullViewProps {
	widget: Widgets;
	fullViewOptions?: boolean;
	onClickHandler?: OnClickPluginOpts['onClick'];
	customOnDragSelect?: (start: number, end: number) => void;
	name: string;
	tableProcessedDataRef: MutableRefObject<RowData[]>;
	version?: string;
	originalName: string;
	yAxisUnit?: string;
	isDependedDataLoaded?: boolean;
	onToggleModelHandler?: GraphManagerProps['onToggleModelHandler'];
	setCurrentGraphRef: Dispatch<SetStateAction<RefObject<HTMLDivElement> | null>>;
	enableDrillDown?: boolean;
}

interface GraphManagerProps extends UplotProps {
	name: string;
	yAxisUnit?: string;
	onToggleModelHandler?: () => void;
	options: uPlot.Options;
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates: Dispatch<SetStateAction<boolean[]>>;
	lineChartRef?: MutableRefObject<ToggleGraphProps | undefined>;
	parentChartRef?: MutableRefObject<ToggleGraphProps | undefined>;
}

export interface SaveLegendEntriesToLocalStoreProps {
	options: uPlot.Options;
	graphVisibilityState: boolean[];
	name: string;
}

export interface GraphContainerProps {
	isGraphLegendToggleAvailable: boolean;
}

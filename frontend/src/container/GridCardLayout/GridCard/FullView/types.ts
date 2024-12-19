import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ToggleGraphProps } from 'components/Graph/types';
import { UplotProps } from 'components/Uplot/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import uPlot from 'uplot';

export interface DataSetProps {
	index: number;
	data: number | null;
	label: string;
	borderWidth: number;
	spanGaps: boolean;
	animations: boolean;
	borderColor: string;
	showLine: boolean;
	pointRadius: number;
}

export interface LegendEntryProps {
	label: string;
	show: boolean;
}

export type ExtendedChartDataset = uPlot.Series & {
	show: boolean;
	sum: number;
	avg: number;
	min: number;
	max: number;
	index: number;
};

export type PanelTypeAndGraphManagerVisibilityProps = Record<
	keyof typeof PANEL_TYPES,
	boolean
>;

export interface LabelProps {
	labelClickedHandler: (labelIndex: number) => void;
	labelIndex: number;
	label: string;
	disabled?: boolean;
}

export interface FullViewProps {
	widget: Widgets;
	fullViewOptions?: boolean;
	onClickHandler?: OnClickPluginOpts['onClick'];
	name: string;
	tableProcessedDataRef: MutableRefObject<RowData[]>;
	version?: string;
	originalName: string;
	yAxisUnit?: string;
	isDependedDataLoaded?: boolean;
	onToggleModelHandler?: GraphManagerProps['onToggleModelHandler'];
}

export interface GraphManagerProps extends UplotProps {
	name: string;
	yAxisUnit?: string;
	onToggleModelHandler?: () => void;
	options: uPlot.Options;
	graphsVisibilityStates?: boolean[];
	setGraphsVisibilityStates: Dispatch<SetStateAction<boolean[]>>;
	lineChartRef?: MutableRefObject<ToggleGraphProps | undefined>;
	parentChartRef?: MutableRefObject<ToggleGraphProps | undefined>;
}

export interface CheckBoxProps {
	data: ExtendedChartDataset[];
	index: number;
	graphVisibilityState: boolean[];
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
	disabled?: boolean;
}

export interface SaveLegendEntriesToLocalStoreProps {
	options: uPlot.Options;
	graphVisibilityState: boolean[];
	name: string;
}

export interface GraphContainerProps {
	isGraphLegendToggleAvailable: boolean;
}

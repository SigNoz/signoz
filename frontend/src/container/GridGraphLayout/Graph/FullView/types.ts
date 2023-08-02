import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ChartData, ChartDataset } from 'chart.js';
import { GraphOnClickHandler } from 'components/Graph/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Widgets } from 'types/api/dashboard/getAll';

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

export type ExtendedChartDataset = ChartDataset & {
	show: boolean;
	sum: number;
	avg: number;
	min: number;
	max: number;
};

export type PanelTypeAndGraphManagerVisibilityProps = Record<
	keyof typeof PANEL_TYPES,
	boolean
>;

export interface LabelProps {
	labelClickedHandler: (labelIndex: number) => void;
	labelIndex: number;
	label: string;
}

export interface GraphManagerProps {
	data: ChartData;
	name: string;
	yAxisUnit?: string;
	onToggleModelHandler?: () => void;
}

export interface CheckBoxProps {
	data: ChartData;
	index: number;
	graphVisibilityState: boolean[];
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
}

export interface FullViewProps {
	widget: Widgets;
	fullViewOptions?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	onDragSelect?: (start: number, end: number) => void;
	isDependedDataLoaded?: boolean;
	graphsVisibilityStates?: boolean[];
	onToggleModelHandler?: GraphManagerProps['onToggleModelHandler'];
}

export interface SaveLegendEntriesToLocalStoreProps {
	data: ChartData;
	graphVisibilityState: boolean[];
	name: string;
}

export interface GraphContainerProps {
	isGraphLegendToggleAvailable: boolean;
}

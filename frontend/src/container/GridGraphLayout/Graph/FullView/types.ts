import { ChartDataset } from 'chart.js';
import { PANEL_TYPES } from 'constants/queryBuilder';

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

export type PanelTypeAndGraphManagerVisibilityProps = {
	[key in keyof typeof PANEL_TYPES]: boolean;
};

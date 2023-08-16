import { ChartData } from 'chart.js';
import { ReactNode } from 'react';

export type GridValueComponentProps = {
	data: ChartData;
	title?: ReactNode;
	yAxisUnit?: string;
};

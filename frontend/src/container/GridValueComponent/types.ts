import { ChartData } from 'chart.js';
import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { ReactNode } from 'react';

export type GridValueComponentProps = {
	data: ChartData;
	title?: ReactNode;
	yAxisUnit?: string;
	thresholds?: ThresholdProps[];
};

import { Chart, ChartConfiguration } from 'chart.js';
import { MutableRefObject } from 'react';

export const toggleGraph = (
	graphIndex: number,
	isVisible: boolean,
	lineChartRef: MutableRefObject<Chart | undefined>,
): void => {
	if (lineChartRef && lineChartRef.current) {
		const { type } = lineChartRef.current?.config as ChartConfiguration;
		if (type === 'pie' || type === 'doughnut') {
			lineChartRef.current?.toggleDataVisibility(graphIndex);
		} else {
			lineChartRef.current?.setDatasetVisibility(graphIndex, isVisible);
		}
		lineChartRef.current?.update();
	}
};

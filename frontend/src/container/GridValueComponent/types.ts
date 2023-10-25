import uPlot from 'uplot';

export type GridValueComponentProps = {
	data: uPlot.AlignedData;
	options?: uPlot.Options;
	title?: React.ReactNode;
	yAxisUnit?: string;
};

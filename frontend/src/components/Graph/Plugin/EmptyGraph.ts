import { grey } from '@ant-design/colors';
import { Chart } from 'chart.js';

export const emptyGraph = {
	id: 'emptyChart',
	afterDraw(chart: Chart): void {
		const { height, width, ctx } = chart;
		chart.clear();
		ctx.save();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = '1.5rem sans-serif';
		ctx.fillStyle = `${grey.primary}`;
		ctx.fillText('No data', width / 2, height / 2);
		ctx.restore();
	},
};

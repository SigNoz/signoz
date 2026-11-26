import type uPlot from 'uplot';

import { buildClickData } from '../utils';

jest.mock('lib/uPlotLib/plugins/onClickPlugin', () => ({
	getFocusedSeriesAtPosition: jest.fn(() => ({ seriesIndex: 1 })),
}));

const event = {
	offsetX: 10,
	offsetY: 20,
	clientX: 110,
	clientY: 220,
} as MouseEvent;

describe('buildClickData', () => {
	it('skips the x-index lookups on a faceted plot, which has no shared x series', () => {
		const posToIdx = jest.fn(() => {
			throw new Error('faceted data[0] is null');
		});
		const plot = {
			data: [null],
			posToVal: (pos: number): number => pos * 2,
			posToIdx,
		} as unknown as uPlot;

		expect(buildClickData(event, plot)).toStrictEqual({
			xValue: 20,
			yValue: 40,
			focusedSeries: null,
			clickedDataTimestamp: 20,
			mouseX: 10,
			mouseY: 20,
			absoluteMouseX: 110,
			absoluteMouseY: 220,
		});
		expect(posToIdx).not.toHaveBeenCalled();
	});

	it('resolves the focused series and clicked timestamp on an aligned plot', () => {
		const plot = {
			data: [[100, 200, 300]],
			posToVal: (pos: number): number => pos,
			posToIdx: (): number => 1,
		} as unknown as uPlot;

		expect(buildClickData(event, plot)).toMatchObject({
			focusedSeries: { seriesIndex: 1 },
			clickedDataTimestamp: 200,
		});
	});
});

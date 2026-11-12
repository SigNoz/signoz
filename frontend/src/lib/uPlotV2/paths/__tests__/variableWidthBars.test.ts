import type uPlot from 'uplot';

import { createVariableWidthBarsPathBuilder } from '../variableWidthBars';

class FakePath2D {
	rects: number[][] = [];

	rect(x: number, y: number, width: number, height: number): void {
		this.rects.push([x, y, width, height]);
	}
}

/** 10 px per unit on both axes; y grows downward from 100. */
const plot = {
	valToPos: (value: number, scaleKey: string): number =>
		scaleKey === 'x' ? value * 10 : 100 - value * 10,
	ctx: {},
} as unknown as uPlot;

describe('createVariableWidthBarsPathBuilder', () => {
	const originalPath2D = globalThis.Path2D;

	beforeAll(() => {
		globalThis.Path2D = FakePath2D as unknown as typeof Path2D;
	});

	afterAll(() => {
		globalThis.Path2D = originalPath2D;
	});

	function build(
		pattern: CanvasPattern | null = null,
	): ReturnType<uPlot.Series.PathBuilder> {
		return createVariableWidthBarsPathBuilder({
			getBars: () => [
				{ x0: 0, x1: 1, y0: 0, y1: 2, hatched: false },
				{ x0: 1, x1: 4, y0: 0, y1: 5, hatched: false },
				{ x0: 4, x1: 6, y0: 1, y1: 3, hatched: true },
			],
			fill: '#ff0000',
			hatchedFill: '#ff000066',
			getHatchPattern: () => pattern,
			gapPx: 2,
		})(plot, 1, 0, 0);
	}

	it('draws each bar at its own width, inset by half the gap', () => {
		const fills = build()?.fill as unknown as Map<string, FakePath2D>;

		expect(fills.get('#ff0000')?.rects).toStrictEqual([
			[1, 80, 8, 20],
			[11, 50, 28, 50],
		]);
	});

	it('draws hatched bars in their own fill, with the pattern on top', () => {
		const pattern = {} as CanvasPattern;
		const fills = build(pattern)?.fill as unknown as Map<unknown, FakePath2D>;

		expect([...fills.keys()]).toStrictEqual(['#ff0000', '#ff000066', pattern]);
		expect(fills.get(pattern)?.rects).toStrictEqual([[41, 70, 18, 20]]);
	});
	it('reads a fill callback on every draw', () => {
		let fill = '#ff0000';
		const builder = createVariableWidthBarsPathBuilder({
			getBars: () => [{ x0: 0, x1: 1, y0: 0, y1: 1, hatched: false }],
			fill: () => fill,
			hatchedFill: '#00ff00',
			getHatchPattern: () => null,
			gapPx: 0,
		});

		const first = builder(plot, 1, 0, 0)?.fill as unknown as Map<string, unknown>;
		fill = '#0000ff';
		const second = builder(plot, 1, 0, 0)?.fill as unknown as Map<
			string,
			unknown
		>;

		expect([...first.keys()]).toStrictEqual(['#ff0000']);
		expect([...second.keys()]).toStrictEqual(['#0000ff']);
	});

	it('keeps solid bars when the hatched fill is the same colour', () => {
		const fills = createVariableWidthBarsPathBuilder({
			getBars: () => [
				{ x0: 0, x1: 1, y0: 0, y1: 1, hatched: false },
				{ x0: 1, x1: 2, y0: 0, y1: 1, hatched: true },
			],
			fill: 'red',
			hatchedFill: 'red',
			getHatchPattern: () => null,
			gapPx: 0,
		})(plot, 1, 0, 0)?.fill as unknown as Map<string, FakePath2D>;

		expect(fills.get('red')?.rects).toHaveLength(2);
	});
});

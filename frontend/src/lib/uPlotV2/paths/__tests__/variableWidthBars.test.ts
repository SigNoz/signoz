import type uPlot from 'uplot';

import { createVariableWidthBarsPathBuilder } from '../variableWidthBars';

class FakePath2D {
	rects: number[][] = [];

	rect(x: number, y: number, width: number, height: number): void {
		this.rects.push([x, y, width, height]);
	}
}

/** 10 px per unit on both axes; y grows downward from 100. */
const fakePlot: Partial<uPlot> = {
	valToPos: (value: number, scaleKey: string): number =>
		scaleKey === 'x' ? value * 10 : 100 - value * 10,
	ctx: {} as CanvasRenderingContext2D,
};
const plot = fakePlot as uPlot;

type Fills = Map<CanvasRenderingContext2D['fillStyle'], Path2D>;

function fillsOf(paths: ReturnType<uPlot.Series.PathBuilder>): Fills {
	const fill = paths?.fill;
	if (!(fill instanceof Map)) {
		throw new Error('expected a fill per style');
	}
	return fill;
}

function rectsOf(path: Path2D | undefined): number[][] {
	if (!(path instanceof FakePath2D)) {
		throw new Error('expected a FakePath2D');
	}
	return path.rects;
}

describe('createVariableWidthBarsPathBuilder', () => {
	const originalPath2D = globalThis.Path2D;

	beforeAll(() => {
		Object.defineProperty(globalThis, 'Path2D', {
			value: FakePath2D,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(globalThis, 'Path2D', {
			value: originalPath2D,
			configurable: true,
		});
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
		const fills = fillsOf(build());

		expect(rectsOf(fills.get('#ff0000'))).toStrictEqual([
			[1, 80, 8, 20],
			[11, 50, 28, 50],
		]);
	});

	it('draws hatched bars in their own fill, with the pattern on top', () => {
		const pattern = {} as CanvasPattern;
		const fills = fillsOf(build(pattern));

		expect([...fills.keys()]).toStrictEqual(['#ff0000', '#ff000066', pattern]);
		expect(rectsOf(fills.get(pattern))).toStrictEqual([[41, 70, 18, 20]]);
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

		const first = fillsOf(builder(plot, 1, 0, 0));
		fill = '#0000ff';
		const second = fillsOf(builder(plot, 1, 0, 0));

		expect([...first.keys()]).toStrictEqual(['#ff0000']);
		expect([...second.keys()]).toStrictEqual(['#0000ff']);
	});

	it('keeps solid bars when the hatched fill is the same colour', () => {
		const fills = fillsOf(
			createVariableWidthBarsPathBuilder({
				getBars: () => [
					{ x0: 0, x1: 1, y0: 0, y1: 1, hatched: false },
					{ x0: 1, x1: 2, y0: 0, y1: 1, hatched: true },
				],
				fill: 'red',
				hatchedFill: 'red',
				getHatchPattern: () => null,
				gapPx: 0,
			})(plot, 1, 0, 0),
		);

		expect(rectsOf(fills.get('red'))).toHaveLength(2);
	});

	it('hatches only overflow bars when both fills are the same colour', () => {
		const pattern = {} as CanvasPattern;
		const fills = fillsOf(
			createVariableWidthBarsPathBuilder({
				getBars: () => [
					{ x0: 0, x1: 1, y0: 0, y1: 1, hatched: false },
					{ x0: 1, x1: 2, y0: 0, y1: 1, hatched: true },
				],
				fill: 'red',
				hatchedFill: 'red',
				getHatchPattern: () => pattern,
				gapPx: 0,
			})(plot, 1, 0, 0),
		);

		expect(rectsOf(fills.get(pattern))).toStrictEqual([[10, 90, 10, 10]]);
	});
});

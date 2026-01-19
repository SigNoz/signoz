import heatmapPlugin, {
	computeScale,
	computeStepSize,
	getBucketIndexForY,
	getXValBounds,
	normalizeIntensity,
	rectFromBounds,
} from './heatmapPlugin';

describe('heatmapPlugin helpers', () => {
	describe('rectFromBounds', () => {
		it('calculates correct rectangle dimensions', () => {
			expect(rectFromBounds(0, 0, 10, 10)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
			expect(rectFromBounds(10, 10, 0, 0)).toEqual({ x: 0, y: 0, w: 10, h: 10 });
			expect(rectFromBounds(5, 5, 5, 5)).toEqual({ x: 5, y: 5, w: 1, h: 1 }); // Min w/h is 1
		});
	});

	describe('getBucketIndexForY', () => {
		it('finds correct bucket index', () => {
			const starts = [0, 10, 20];
			const ends = [10, 20, 30];
			expect(getBucketIndexForY(5, starts, ends)).toBe(0);
			expect(getBucketIndexForY(15, starts, ends)).toBe(1);
			expect(getBucketIndexForY(25, starts, ends)).toBe(2);
			expect(getBucketIndexForY(30, starts, ends)).toBe(2);
			expect(getBucketIndexForY(35, starts, ends)).toBe(-1);
			expect(getBucketIndexForY(-5, starts, ends)).toBe(-1);
		});
	});

	describe('normalizeIntensity', () => {
		it('normalizes value correctly', () => {
			const maxForScale = 100;
			const logDenom = Math.log1p(100);
			const val = 10;
			const expected = Math.log1p(val) / logDenom;
			expect(normalizeIntensity(val, maxForScale, logDenom)).toBeCloseTo(expected);
		});

		it('handles zero or negative values', () => {
			expect(normalizeIntensity(0, 100, 1)).toBe(0);
			expect(normalizeIntensity(-10, 100, 1)).toBe(0);
		});

		it('clamps to 1 if value exceeds max', () => {
			const maxForScale = 100;
			const logDenom = Math.log1p(100);
			expect(normalizeIntensity(200, maxForScale, logDenom)).toBe(1);
		});
	});

	describe('computeStepSize', () => {
		it('calculates step size from xVals', () => {
			expect(computeStepSize([10, 20, 30])).toBe(10);
			expect(computeStepSize([10, 12, 14])).toBe(2);
		});

		it('handles single value array', () => {
			expect(computeStepSize([10])).toBe(1);
		});
		it('picks approximate quartile step', () => {
			const xVals = [0, 2, 12, 22, 32];
			expect(computeStepSize(xVals)).toBe(2);
		});
	});

	describe('getXValBounds', () => {
		it('calculates bounds centered on x', () => {
			const xVals = [10, 20, 30];
			expect(getXValBounds(xVals, 1, 10)).toEqual({ leftVal: 15, rightVal: 25 });
		});

		it('handles first element', () => {
			const xVals = [10, 20];
			expect(getXValBounds(xVals, 0, 10)).toEqual({ leftVal: 5, rightVal: 15 });
		});
	});

	describe('computeScale', () => {
		it('calculates scale based on P99', () => {
			const values = [Array.from({ length: 100 }, (_, i) => i + 1)]; // 1 to 100
			const result = computeScale(values);

			expect(result.maxForScale).toBe(99);
			expect(result.logDenom).toBeCloseTo(Math.log1p(99));
		});

		it('handles empty values', () => {
			expect(computeScale([])).toEqual({ maxForScale: 0, logDenom: 0 });
		});
	});
});

describe('heatmapPlugin integration', () => {
	let mockCtx: any;
	let mockUPlot: any;

	beforeEach(() => {
		mockCtx = {
			fillRect: jest.fn(),
			beginPath: jest.fn(),
			rect: jest.fn(),
			stroke: jest.fn(),
			save: jest.fn(),
			restore: jest.fn(),
			clip: jest.fn(),
			moveTo: jest.fn(),
			lineTo: jest.fn(),
			canvas: document.createElement('canvas'),
		};

		mockUPlot = {
			data: [],
			ctx: mockCtx,
			over: document.createElement('div'),
			bbox: { left: 0, top: 0, width: 300, height: 200 },
			cursor: { left: 10, top: 20, idx: 0 },
			valToPos: (v: number): number => v,
			posToVal: (v: number): number => v,
		};
	});

	it('calls onHover when cursor moves over data', () => {
		const onHover = jest.fn();
		const plugin = heatmapPlugin({ palette: ['red'], onHover });

		(plugin.hooks.init as any)(mockUPlot);

		// Setup data: xVals, unused, unused, starts, ends, values
		mockUPlot.data = [
			[0, 10], // xVals
			[],
			[],
			[
				[0, 10],
				[0, 10],
			], // bucketStarts
			[
				[10, 20],
				[10, 20],
			], // bucketEnds
			[
				[5, 0],
				[0, 8],
			], // values
		];

		mockUPlot.cursor.top = 5;

		(plugin.hooks.setCursor as any)(mockUPlot);

		// With y=5, it should hit index 0 ([0, 10]). Count is 5.
		expect(onHover).toHaveBeenCalledWith(
			expect.objectContaining({ xi: 0, yi: 0, count: 5 }),
			expect.any(Object),
		);
	});

	it('draws heatmap cells on canvas', () => {
		const plugin = heatmapPlugin({ palette: ['red', 'blue'] });

		mockUPlot.data = [
			[0], // xVals
			[],
			[],
			[[0]], // bucketStarts
			[[10]], // bucketEnds
			[[100]], // values
		];

		// Trigger draw
		(plugin.hooks.draw as any)(mockUPlot);

		expect(mockCtx.save).toHaveBeenCalled();
		expect(mockCtx.beginPath).toHaveBeenCalled();
		expect(mockCtx.clip).toHaveBeenCalled();
		// fillRect should be called for the cell
		expect(mockCtx.fillRect).toHaveBeenCalled();
		expect(mockCtx.restore).toHaveBeenCalled();
	});

	it('draws grid lines when enabled', () => {
		const plugin = heatmapPlugin({
			palette: ['red'],
			showGrid: true,
			gridColor: 'black',
		});

		mockUPlot.data = [
			[0], // xVals
			[],
			[],
			[[0]], // bucketStarts
			[[10]], // bucketEnds
			[[100]], // values
		];

		(plugin.hooks.draw as any)(mockUPlot);

		expect(mockCtx.stroke).toHaveBeenCalled();
		// Check if grid color set
		expect(mockCtx.strokeStyle).toBe('black');
	});
});

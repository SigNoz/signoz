import {
	convertToHeatmapData,
	countsToFills,
	generateHeatmapPalette,
} from './heatmap';

describe('heatmap utility functions', () => {
	describe('convertToHeatmapData', () => {
		it('converts timestamps, bucket indices, and counts to flat arrays', () => {
			const timestamps = [1000, 2000];
			const bucketIndices = [0, 1, 2];
			const counts = [
				[5, 10, 15],
				[8, 12, 18],
			];

			const [xs, ys, countsFlat] = convertToHeatmapData(
				timestamps,
				bucketIndices,
				counts,
			);

			expect(xs).toEqual([1000, 1000, 1000, 2000, 2000, 2000]);
			expect(ys).toEqual([0, 1, 2, 0, 1, 2]);
			expect(countsFlat).toEqual([5, 10, 15, 8, 12, 18]);
		});

		it('handles empty data', () => {
			const [xs, ys, countsFlat] = convertToHeatmapData([], [], []);

			expect(xs).toEqual([]);
			expect(ys).toEqual([]);
			expect(countsFlat).toEqual([]);
		});

		it('handles missing counts with zeros', () => {
			const timestamps = [1000];
			const bucketIndices = [0, 1, 2];
			const counts = [[5]]; // Missing counts for buckets 1 and 2

			const [_xs, _ys, countsFlat] = convertToHeatmapData(
				timestamps,
				bucketIndices,
				counts,
			);

			expect(countsFlat).toEqual([5, 0, 0]);
		});
	});

	describe('generateHeatmapPalette', () => {
		it('generates correct number of colors', () => {
			const palette = generateHeatmapPalette(10);
			expect(palette).toHaveLength(10);
		});

		it('generates colors in RGB format', () => {
			const palette = generateHeatmapPalette(5);
			palette.forEach((color) => {
				expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
			});
		});

		it('uses custom gradient stops', () => {
			const customStops = [
				{ position: 0.0, color: [255, 0, 0] as [number, number, number] },
				{ position: 1.0, color: [0, 0, 255] as [number, number, number] },
			];

			const palette = generateHeatmapPalette(3, customStops);
			expect(palette[0]).toBe('rgb(255,0,0)'); // Red
			expect(palette[2]).toBe('rgb(0,0,255)'); // Blue
		});
	});

	describe('countsToFills', () => {
		it('returns fill indices based on count values', () => {
			const palette = ['#color1', '#color2', '#color3'];
			const fillsFn = countsToFills(palette);

			const mockUplot = {
				data: [
					null,
					{
						counts: [10, 20, 30, 40, 50],
					},
				],
			} as any;

			const fills = fillsFn(mockUplot, 1);

			expect(fills).toHaveLength(5);
			expect(fills.every((f) => f >= 0 && f < palette.length)).toBe(true);
		});

		it('returns -1 for zero counts', () => {
			const palette = ['#color1', '#color2'];
			const fillsFn = countsToFills(palette);

			const mockUplot = {
				data: [
					null,
					{
						counts: [0, 10, 0, 20],
					},
				],
			} as any;

			const fills = fillsFn(mockUplot, 1);

			expect(fills[0]).toBe(-1);
			expect(fills[2]).toBe(-1);
			expect(fills[1]).toBeGreaterThanOrEqual(0);
			expect(fills[3]).toBeGreaterThanOrEqual(0);
		});

		it('returns empty array when no counts', () => {
			const palette = ['#color1'];
			const fillsFn = countsToFills(palette);

			const mockUplot = {
				data: [null, {}],
			} as any;

			const fills = fillsFn(mockUplot, 1);

			expect(fills).toEqual([]);
		});
	});
});

import type uPlot from 'uplot';

import {
	buildChannelRows,
	resolveHoveredPoint,
	ScatterHoveredPoint,
} from '../scatterTooltipContent';

jest.mock('components/Graph/yAxisConfig', () => ({
	getToolTipValue: jest.fn((value: number | string, unit?: string) =>
		`${value} ${unit ?? ''}`.trim(),
	),
}));

const plot = {
	data: [
		null,
		[
			[10, 20],
			[100, 200],
			[5, null],
		],
		[[30], [300]],
	],
	series: [
		{},
		{ label: 'cart', stroke: '#ff0000' },
		{ label: 'checkout', stroke: (): string => '#00ff00' },
	],
} as unknown as uPlot;

describe('resolveHoveredPoint', () => {
	it('reads the focused series at its own data index', () => {
		expect(resolveHoveredPoint(plot, 1, [null, 1, null])).toStrictEqual({
			seriesIndex: 1,
			dataIndex: 1,
			label: 'cart',
			color: '#ff0000',
			x: 20,
			y: 200,
			size: null,
		});
	});

	it('carries the size column when present and resolves function strokes', () => {
		expect(resolveHoveredPoint(plot, 1, [null, 0, null])?.size).toBe(5);
		expect(resolveHoveredPoint(plot, 2, [null, null, 0])).toMatchObject({
			label: 'checkout',
			color: '#00ff00',
			size: null,
		});
	});

	it('is null without a focused series or an index for it', () => {
		expect(resolveHoveredPoint(plot, null, [null, 0, null])).toBeNull();
		expect(resolveHoveredPoint(plot, 0, [0, 0, null])).toBeNull();
		expect(resolveHoveredPoint(plot, 1, [null, null, null])).toBeNull();
	});
});

describe('buildChannelRows', () => {
	const point: ScatterHoveredPoint = {
		seriesIndex: 1,
		dataIndex: 0,
		label: 'cart',
		color: '#f00',
		x: 12,
		y: 340,
		size: 7,
	};

	it('formats x and y with their own units', () => {
		const rows = buildChannelRows(point, {
			x: { label: 'Throughput', unit: 'reqps' },
			y: { label: 'p99', unit: 'ms' },
		});

		expect(rows).toStrictEqual([
			{ label: 'Throughput', value: '12 reqps' },
			{ label: 'p99', value: '340 ms' },
		]);
	});

	it('adds the size row only when the channel is mapped and the point has one', () => {
		const channels = {
			x: { label: 'x' },
			y: { label: 'y' },
			size: { label: 'Errors' },
		};

		expect(buildChannelRows(point, channels)).toHaveLength(3);
		expect(buildChannelRows({ ...point, size: null }, channels)).toHaveLength(2);
	});
});

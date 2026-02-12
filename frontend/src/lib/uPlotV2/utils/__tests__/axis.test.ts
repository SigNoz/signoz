import type uPlot from 'uplot';
import { Axis } from 'uplot';

import {
	buildYAxisSizeCalculator,
	calculateTextWidth,
	getExistingAxisSize,
} from '../axis';

describe('axis utils', () => {
	describe('calculateTextWidth', () => {
		it('returns 0 when values are undefined or empty', () => {
			const mockSelf = ({
				ctx: {
					measureText: jest.fn(),
					font: '',
				},
			} as unknown) as uPlot;

			// internally the type is string but it is an array of strings
			const mockAxis: Axis = { font: (['12px sans-serif'] as unknown) as string };

			expect(calculateTextWidth(mockSelf, mockAxis, undefined)).toBe(0);
			expect(calculateTextWidth(mockSelf, mockAxis, [])).toBe(0);
		});

		it('returns 0 when longest value is empty string or axis has no usable font', () => {
			const mockSelf = ({
				ctx: {
					measureText: jest.fn(),
					font: '',
				},
			} as unknown) as uPlot;

			const axisWithoutFont: Axis = { font: '' };
			const axisWithEmptyFontArray: Axis = { font: '' };

			expect(calculateTextWidth(mockSelf, axisWithoutFont, [''])).toBe(0);
			expect(
				calculateTextWidth(mockSelf, axisWithEmptyFontArray, ['a', 'bb']),
			).toBe(0);
		});

		it('measures longest value using canvas context and axis font', () => {
			const measureText = jest.fn(() => ({ width: 100 }));
			const mockSelf = ({
				ctx: {
					font: '',
					measureText,
				},
			} as unknown) as uPlot;

			const mockAxis: Axis = { font: (['14px Arial'] as unknown) as string };
			const values = ['1', '1234', '12'];
			const dpr =
				((global as unknown) as { devicePixelRatio?: number }).devicePixelRatio ??
				1;

			const result = calculateTextWidth(mockSelf, mockAxis, values);

			expect(measureText).toHaveBeenCalledWith('1234');
			expect(mockSelf.ctx.font).toBe('14px Arial');
			expect(result).toBe(100 / dpr);
		});
	});

	describe('getExistingAxisSize', () => {
		it('returns internal _size when present', () => {
			const axis: any = {
				_size: 42,
				size: 10,
			};

			const result = getExistingAxisSize({
				uplotInstance: ({} as unknown) as uPlot,
				axis,
				axisIdx: 0,
				cycleNum: 0,
			});

			expect(result).toBe(42);
		});

		it('invokes size function when _size is not set', () => {
			const sizeFn = jest.fn(() => 24);
			const axis: Axis = { size: sizeFn };
			const instance = ({} as unknown) as uPlot;

			const result = getExistingAxisSize({
				uplotInstance: instance,
				axis,
				values: ['10', '20'],
				axisIdx: 1,
				cycleNum: 2,
			});

			expect(sizeFn).toHaveBeenCalledWith(instance, ['10', '20'], 1, 2);
			expect(result).toBe(24);
		});

		it('returns numeric size or 0 when neither _size nor size are provided', () => {
			const axisWithSize: Axis = { size: 16 };
			const axisWithoutSize: Axis = {};
			const instance = ({} as unknown) as uPlot;

			expect(
				getExistingAxisSize({
					uplotInstance: instance,
					axis: axisWithSize,
					axisIdx: 0,
					cycleNum: 0,
				}),
			).toBe(16);

			expect(
				getExistingAxisSize({
					uplotInstance: instance,
					axis: axisWithoutSize,
					axisIdx: 0,
					cycleNum: 0,
				}),
			).toBe(0);
		});
	});

	describe('buildYAxisSizeCalculator', () => {
		it('delegates to getExistingAxisSize when cycleNum > 1', () => {
			const sizeCalculator = buildYAxisSizeCalculator(5);

			const axis: any = {
				_size: 80,
				ticks: { size: 10 },
				font: ['12px sans-serif'],
			};

			const measureText = jest.fn(() => ({ width: 60 }));
			const self = ({
				axes: [axis],
				ctx: {
					font: '',
					measureText,
				},
			} as unknown) as uPlot;

			if (typeof sizeCalculator === 'number') {
				throw new Error('Size calculator is a number');
			}

			const result = sizeCalculator(self, ['10', '20'], 0, 2);

			expect(result).toBe(80);
			expect(measureText).not.toHaveBeenCalled();
		});

		it('computes size from ticks, gap and text width when cycleNum <= 1', () => {
			const gap = 7;
			const sizeCalculator = buildYAxisSizeCalculator(gap);

			const axis: Axis = {
				ticks: { size: 12 },
				font: (['12px sans-serif'] as unknown) as string,
			};

			const measureText = jest.fn(() => ({ width: 50 }));
			const self = ({
				axes: [axis],
				ctx: {
					font: '',
					measureText,
				},
			} as unknown) as uPlot;

			const dpr =
				((global as unknown) as { devicePixelRatio?: number }).devicePixelRatio ??
				1;
			const expected = Math.ceil(12 + gap + 50 / dpr);

			if (typeof sizeCalculator === 'number') {
				throw new Error('Size calculator is a number');
			}

			const result = sizeCalculator(self, ['short', 'the-longest'], 0, 0);
			expect(measureText).toHaveBeenCalledWith('the-longest');
			expect(result).toBe(expected);
		});

		it('uses 0 ticks size when ticks are not defined', () => {
			const gap = 4;
			const sizeCalculator = buildYAxisSizeCalculator(gap);

			const axis: Axis = {
				font: (['12px sans-serif'] as unknown) as string,
			};

			const measureText = jest.fn(() => ({ width: 40 }));
			const self = ({
				axes: [axis],
				ctx: {
					font: '',
					measureText,
				},
			} as unknown) as uPlot;

			const dpr =
				((global as unknown) as { devicePixelRatio?: number }).devicePixelRatio ??
				1;
			const expected = Math.ceil(gap + 40 / dpr);

			if (typeof sizeCalculator === 'number') {
				throw new Error('Size calculator is a number');
			}

			const result = sizeCalculator(self, ['1', '123'], 0, 1);

			expect(result).toBe(expected);
		});
	});
});

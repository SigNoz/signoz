import { MAX_LOG_SCALE } from '../constants';
import {
	bandsPerDoublingFromScale,
	formatUpperBound,
	hasBoundsBeyondPreview,
	kindOptionOf,
	linearBuckets,
	logBuckets,
	previewUpperBounds,
	scaleFromBandsPerDoubling,
} from '../utils';

describe('bucket option scales', () => {
	it.each([
		[0, 1],
		[1, 2],
		[2, 4],
		[3, 8],
		[4, 16],
	])('scale %i is %i bands per doubling', (scale, bands) => {
		expect(bandsPerDoublingFromScale(scale)).toBe(bands);
		expect(scaleFromBandsPerDoubling(bands)).toBe(scale);
	});
});

describe('kindOptionOf', () => {
	it('reads no options as auto', () => {
		expect(kindOptionOf(undefined)).toBe('auto');
	});

	it('reads the kind off the options', () => {
		expect(kindOptionOf(logBuckets(MAX_LOG_SCALE))).toBe('log');
		expect(kindOptionOf(linearBuckets(10, null))).toBe('linear');
	});
});

describe('previewUpperBounds', () => {
	it('doubles at one band per doubling', () => {
		expect(previewUpperBounds(logBuckets(0))).toStrictEqual([
			1, 2, 4, 8, 16, 32, 64, 128,
		]);
	});

	it('falls back to the finest log axis when no options are set', () => {
		const bounds = previewUpperBounds(undefined);

		expect(bounds).toHaveLength(8);
		// 16 bands per doubling: the eighth bound is 2^(7/16), still short of the first doubling.
		expect(bounds?.[7]).toBeCloseTo(2 ** (7 / 16));
	});

	it('spaces a linear axis evenly by bucket width', () => {
		expect(previewUpperBounds(linearBuckets(100, 10))).toStrictEqual(
			[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].slice(0, 8),
		);
	});

	it('stops at the last bucket when the axis has fewer than the preview shows', () => {
		expect(previewUpperBounds(linearBuckets(9, 3))).toStrictEqual([3, 6, 9]);
	});

	it('has no bounds to preview for a linear axis without a usable max value', () => {
		expect(previewUpperBounds(linearBuckets(0, null))).toBeUndefined();
		expect(previewUpperBounds(linearBuckets(-1, null))).toBeUndefined();
	});
});

describe('hasBoundsBeyondPreview', () => {
	it('is always true for a log axis, which has no top', () => {
		expect(hasBoundsBeyondPreview(logBuckets(0))).toBe(true);
		expect(hasBoundsBeyondPreview(undefined)).toBe(true);
	});

	it('tracks whether a linear axis runs past the preview', () => {
		expect(hasBoundsBeyondPreview(linearBuckets(100, 4))).toBe(false);
		expect(hasBoundsBeyondPreview(linearBuckets(100, 20))).toBe(true);
	});
});

describe('formatUpperBound', () => {
	it('reads a bound in the panel unit when one is set', () => {
		expect(formatUpperBound(1, 'ms')).toContain('ms');
	});

	it('keeps three significant digits when unitless', () => {
		expect(formatUpperBound(128, undefined)).toBe('128');
		expect(formatUpperBound(2 ** (1 / 16), undefined)).toBe('1.04');
	});
});

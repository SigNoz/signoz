import {
	getNextDurationInLadder,
	getNextZoomOutRange,
	isZoomOutDisabled,
	ZoomOutResult,
} from '../zoomOutUtils';

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

// Fixed "now" for deterministic tests: 2024-01-15 12:00:00 UTC
const NOW_MS = 1705312800000;

describe('zoomOutUtils', () => {
	beforeEach(() => {
		jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('getNextDurationInLadder', () => {
		it('should use 3x zoom out below 15m until reaching 15m', () => {
			expect(getNextDurationInLadder(1 * MS_PER_MIN)).toBe(3 * MS_PER_MIN);
			expect(getNextDurationInLadder(2 * MS_PER_MIN)).toBe(6 * MS_PER_MIN);
			expect(getNextDurationInLadder(3 * MS_PER_MIN)).toBe(9 * MS_PER_MIN);
			expect(getNextDurationInLadder(4 * MS_PER_MIN)).toBe(12 * MS_PER_MIN);
			expect(getNextDurationInLadder(5 * MS_PER_MIN)).toBe(15 * MS_PER_MIN); // cap at 15m
			expect(getNextDurationInLadder(6 * MS_PER_MIN)).toBe(15 * MS_PER_MIN); // 18m capped
		});

		it('should return next step for each ladder rung from 15m onward', () => {
			expect(getNextDurationInLadder(10 * MS_PER_MIN)).toBe(15 * MS_PER_MIN);
			expect(getNextDurationInLadder(15 * MS_PER_MIN)).toBe(45 * MS_PER_MIN);
			expect(getNextDurationInLadder(45 * MS_PER_MIN)).toBe(2 * MS_PER_HOUR);
			expect(getNextDurationInLadder(2 * MS_PER_HOUR)).toBe(7 * MS_PER_HOUR);
			expect(getNextDurationInLadder(7 * MS_PER_HOUR)).toBe(21 * MS_PER_HOUR);
			expect(getNextDurationInLadder(21 * MS_PER_HOUR)).toBe(1 * MS_PER_DAY);
			expect(getNextDurationInLadder(1 * MS_PER_DAY)).toBe(2 * MS_PER_DAY);
			expect(getNextDurationInLadder(2 * MS_PER_DAY)).toBe(3 * MS_PER_DAY);
			expect(getNextDurationInLadder(3 * MS_PER_DAY)).toBe(1 * MS_PER_WEEK);
			expect(getNextDurationInLadder(1 * MS_PER_WEEK)).toBe(2 * MS_PER_WEEK);
			expect(getNextDurationInLadder(2 * MS_PER_WEEK)).toBe(30 * MS_PER_DAY);
		});

		it('should return MAX when at or past 1 month (no wrap)', () => {
			expect(getNextDurationInLadder(30 * MS_PER_DAY)).toBe(30 * MS_PER_DAY);
			expect(getNextDurationInLadder(31 * MS_PER_DAY)).toBe(30 * MS_PER_DAY);
		});

		it('should return next step for duration between ladder rungs', () => {
			expect(getNextDurationInLadder(1 * MS_PER_HOUR)).toBe(2 * MS_PER_HOUR);
			expect(getNextDurationInLadder(5 * MS_PER_HOUR)).toBe(7 * MS_PER_HOUR);
			expect(getNextDurationInLadder(12 * MS_PER_HOUR)).toBe(21 * MS_PER_HOUR);
		});
	});

	describe('getNextZoomOutRange', () => {
		it('should return null when duration is zero or negative', () => {
			expect(getNextZoomOutRange(NOW_MS, NOW_MS)).toBeNull();
			expect(getNextZoomOutRange(NOW_MS, NOW_MS - 1000)).toBeNull();
		});

		it('should return center-anchored range and preset=null when new end does not exceed now (Phase 1)', () => {
			// 15m range centered well before now so zoom to 45m keeps end <= now
			// Center at now-30m: end = center + 22.5m = now - 7.5m <= now
			const centerMs = NOW_MS - 30 * MS_PER_MIN;
			const start15m = centerMs - 7.5 * MS_PER_MIN;
			const end15m = centerMs + 7.5 * MS_PER_MIN;
			const result = getNextZoomOutRange(start15m, end15m) as ZoomOutResult;

			expect(result).not.toBeNull();
			expect(result.preset).toBeNull(); // Phase 1: preserve center-anchored range, avoid GetMinMax "last X from now"
			const [newStart, newEnd] = result.range;
			expect(newEnd - newStart).toBe(45 * MS_PER_MIN);
			const newCenter = (newStart + newEnd) / 2;
			expect(Math.abs(newCenter - centerMs)).toBeLessThan(2000);
			expect(newEnd).toBeLessThanOrEqual(NOW_MS + 1000);
		});

		it('should return end-anchored range when new end would exceed now (Phase 2)', () => {
			// 22hr range ending at now - zoom to 1d (24hr) would push end past now
			// Next ladder step from 22hr is 1d
			const start22h = NOW_MS - 22 * MS_PER_HOUR;
			const end22h = NOW_MS;
			const result = getNextZoomOutRange(start22h, end22h) as ZoomOutResult;

			expect(result).not.toBeNull();
			expect(result.preset).toBe('1d');
			const [newStart, newEnd] = result.range;
			expect(newEnd).toBe(NOW_MS); // End anchored at now
			expect(newStart).toBe(NOW_MS - 1 * MS_PER_DAY);
		});

		it('should return correct preset for each ladder step', () => {
			const presets: [number, number, string][] = [
				[15 * MS_PER_MIN, 0, '45m'],
				[45 * MS_PER_MIN, 0, '2h'],
				[2 * MS_PER_HOUR, 0, '7h'],
				[7 * MS_PER_HOUR, 0, '21h'],
				[21 * MS_PER_HOUR, 0, '1d'],
				[1 * MS_PER_DAY, 0, '2d'],
				[2 * MS_PER_DAY, 0, '3d'],
				[3 * MS_PER_DAY, 0, '1w'],
				[1 * MS_PER_WEEK, 0, '2w'],
				[2 * MS_PER_WEEK, 0, '1month'],
			];

			presets.forEach(([durationMs, offset, expectedPreset]) => {
				const end = NOW_MS - offset;
				const start = end - durationMs;
				const result = getNextZoomOutRange(start, end);
				expect(result?.preset).toBe(expectedPreset);
			});
		});

		it('isZoomOutDisabled returns true when duration >= 1 month', () => {
			expect(isZoomOutDisabled(30 * MS_PER_DAY)).toBe(true);
			expect(isZoomOutDisabled(31 * MS_PER_DAY)).toBe(true);
			expect(isZoomOutDisabled(29 * MS_PER_DAY)).toBe(false);
			expect(isZoomOutDisabled(15 * MS_PER_MIN)).toBe(false);
		});

		it('should return null when at 1 month (no zoom out beyond max)', () => {
			const start1m = NOW_MS - 30 * MS_PER_DAY;
			const end1m = NOW_MS;
			const result = getNextZoomOutRange(start1m, end1m);

			expect(result).toBeNull();
		});

		it('should zoom out 3x from 5m range to 15m then continue with ladder', () => {
			// 5m range ending at now → 3x = 15m
			const start5m = NOW_MS - 5 * MS_PER_MIN;
			const end5m = NOW_MS;
			const result = getNextZoomOutRange(start5m, end5m) as ZoomOutResult;

			expect(result).not.toBeNull();
			expect(result.preset).toBe('15m');
			const [newStart, newEnd] = result.range;
			expect(newEnd - newStart).toBe(15 * MS_PER_MIN);
		});
	});
});

import dayjs from 'dayjs';

import getStep, { DefaultStepSize, MaxDataPoints } from './getStep';

describe('get dynamic step size', () => {
	test('should return default step size if diffSec is less than MaxDataPoints', () => {
		const start = dayjs().subtract(1, 'minute').valueOf();
		const end = dayjs().valueOf();

		const step = getStep({
			start,
			end,
			inputFormat: 'ms',
		});

		expect(step).toBe(DefaultStepSize);
	});

	test('should return appropriate step size if diffSec is more than MaxDataPoints', () => {
		const start = dayjs().subtract(4, 'hour').valueOf();
		const end = dayjs().valueOf();

		const step = getStep({
			start,
			end,
			inputFormat: 'ms',
		});

		// the expected step size should be no less than DefaultStepSize
		const diffSec = Math.abs(dayjs(end).diff(dayjs(start), 's'));
		const expectedStep = Math.max(
			Math.floor(diffSec / MaxDataPoints),
			DefaultStepSize,
		);

		expect(step).toBe(expectedStep);
	});

	test('should correctly handle different input formats', () => {
		const endSec = dayjs().unix();
		const startSec = endSec - 4 * 3600; // 4 hours earlier

		const stepSec = getStep({
			start: startSec,
			end: endSec,
			inputFormat: 's',
		});

		const diffSec = Math.abs(dayjs.unix(endSec).diff(dayjs.unix(startSec), 's'));
		const expectedStep = Math.max(
			Math.floor(diffSec / MaxDataPoints),
			DefaultStepSize,
		);

		expect(stepSec).toBe(expectedStep);

		const startNs = startSec * 1e9; // convert to nanoseconds
		const endNs = endSec * 1e9; // convert to nanoseconds

		const stepNs = getStep({
			start: startNs,
			end: endNs,
			inputFormat: 'ns',
		});

		expect(stepNs).toBe(expectedStep); // Expect the same result as 's' inputFormat
	});

	test('should throw an error for invalid input format', () => {
		const start = dayjs().valueOf();
		const end = dayjs().valueOf();

		expect(() => {
			getStep({
				start,
				end,
				inputFormat: 'invalid' as never,
			});
		}).toThrow('invalid format');
	});

	test('should return DefaultStepSize when start and end are the same', () => {
		const start = dayjs().valueOf();
		const end = start; // same as start

		const step = getStep({
			start,
			end,
			inputFormat: 'ms',
		});

		expect(step).toBe(DefaultStepSize);
	});

	test('should return DefaultStepSize if diffSec is exactly MaxDataPoints', () => {
		const endMs = dayjs().valueOf();
		const startMs = endMs - MaxDataPoints * 1000; // exactly MaxDataPoints seconds earlier

		const step = getStep({
			start: startMs,
			end: endMs,
			inputFormat: 'ms',
		});

		expect(step).toBe(DefaultStepSize); // since calculated step size is less than DefaultStepSize, it should return DefaultStepSize
	});

	test('should return DefaultStepSize for future dates less than (MaxDataPoints * DefaultStepSize) seconds ahead', () => {
		const start = dayjs().valueOf();
		const end = start + MaxDataPoints * DefaultStepSize * 1000 - 1; // just one millisecond less than (MaxDataPoints * DefaultStepSize) seconds ahead

		const step = getStep({
			start,
			end,
			inputFormat: 'ms',
		});

		expect(step).toBe(DefaultStepSize);
	});

	test('should handle string inputs correctly for a time range greater than (MaxDataPoints * DefaultStepSize) seconds', () => {
		const endMs = dayjs().valueOf();
		const startMs = endMs - (MaxDataPoints * DefaultStepSize * 1000 + 1); // one millisecond more than (MaxDataPoints * DefaultStepSize) seconds earlier

		const step = getStep({
			start: startMs.toString(),
			end: endMs.toString(),
			inputFormat: 'ms',
		});

		const diffSec = Math.abs(
			dayjs(Number(endMs)).diff(dayjs(Number(startMs)), 's'),
		);

		expect(step).toBe(Math.floor(diffSec / MaxDataPoints));
	});
});

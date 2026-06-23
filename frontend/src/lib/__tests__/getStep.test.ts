import dayjs from 'dayjs';
import getStep, { DefaultStepSize, MaxDataPoints } from 'lib/getStep';

describe('lib/getStep', () => {
	it('should return default step when the given range is less than 1 day', () => {
		const start = dayjs();
		const end = start.add(1, 'hour');
		const startUnix = start.valueOf();
		const endUnix = end.valueOf();

		expect(
			getStep({
				start: startUnix / 1e3,
				end: endUnix / 1e3,
				inputFormat: 's',
			}),
		).toStrictEqual(DefaultStepSize);

		expect(
			getStep({
				start: startUnix,
				end: endUnix,
				inputFormat: 'ms',
			}),
		).toStrictEqual(DefaultStepSize);

		expect(
			getStep({
				start: startUnix * 1e6,
				end: endUnix * 1e6,
				inputFormat: 'ns',
			}),
		).toStrictEqual(DefaultStepSize);
	});

	it('should return relevant step when the given range is greater than 1 day', () => {
		const start = dayjs();
		const end = start.add(1, 'day').add(1, 'second');
		const startUnix = start.valueOf();
		const endUnix = end.valueOf();

		let expectedStepSize = Math.max(
			Math.floor(end.diff(start, 's') / MaxDataPoints),
			DefaultStepSize,
		);

		expectedStepSize -= expectedStepSize % 60;

		expect(
			getStep({
				start: startUnix / 1e3,
				end: endUnix / 1e3,
				inputFormat: 's',
			}),
		).toStrictEqual(expectedStepSize);

		expect(
			getStep({
				start: startUnix,
				end: endUnix,
				inputFormat: 'ms',
			}),
		).toStrictEqual(expectedStepSize);

		expect(
			getStep({
				start: startUnix * 1e6,
				end: endUnix * 1e6,
				inputFormat: 'ns',
			}),
		).toStrictEqual(expectedStepSize);
	});
});

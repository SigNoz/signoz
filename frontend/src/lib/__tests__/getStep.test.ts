import dayjs from 'dayjs';
import getStep, { DefaultStepSize } from 'lib/getStep';

describe('lib/getStep', () => {
	test('should return default step when the given range is less than 1 day', () => {
		const start = new Date('2022-01-01T00:00:00.000Z').getTime();
		const end = new Date('2022-01-01T12:00:00.000Z').getTime();

		expect(
			getStep({
				start: start / 1e3,
				end: end / 1e3,
				inputFormat: 's',
			}),
		).toEqual(DefaultStepSize);

		expect(
			getStep({
				start: start,
				end: end,
				inputFormat: 'ms',
			}),
		).toEqual(DefaultStepSize);

		expect(
			getStep({
				start: start * 1e6,
				end: end * 1e6,
				inputFormat: 'ns',
			}),
		).toEqual(DefaultStepSize);
	});

	test('should return relevant step when the given range is greater than 1 day', () => {
		const startISOString = '2022-01-01T00:00:00.000Z';
		const endISOString = '2022-01-10T00:00:00.000Z';
		const start = new Date(startISOString).getTime();
		const end = new Date(endISOString).getTime();

		const expectedStepSize =
			dayjs(endISOString).diff(dayjs(startISOString), 'days') * DefaultStepSize;
		expect(
			getStep({
				start: start / 1e3,
				end: end / 1e3,
				inputFormat: 's',
			}),
		).toEqual(expectedStepSize);

		expect(
			getStep({
				start: start,
				end: end,
				inputFormat: 'ms',
			}),
		).toEqual(expectedStepSize);

		expect(
			getStep({
				start: start * 1e6,
				end: end * 1e6,
				inputFormat: 'ns',
			}),
		).toEqual(expectedStepSize);
	});
});

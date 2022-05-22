import dayjs from 'dayjs';

import { convertTimeRange, TIME_UNITS } from '../xAxisConfig';

describe('xAxisConfig for Chart', () => {
	describe('convertTimeRange', () => {
		it('should return relevant time units for given range', () => {
			{
				const start = dayjs();
				const end = start.add(10, 'millisecond');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.millisecond,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'second');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.second,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'minute');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.minute,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'hour');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.hour,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'day');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.day,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'week');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.week,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'month');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.month,
				);
			}
			{
				const start = dayjs();
				const end = start.add(10, 'year');

				expect(convertTimeRange(start.valueOf(), end.valueOf()).unitName).toEqual(
					TIME_UNITS.year,
				);
			}
		});
	});
});

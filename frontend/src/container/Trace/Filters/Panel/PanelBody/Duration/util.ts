import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';

dayjs.extend(durationPlugin);

export const getMs = (value: string): string =>
	parseFloat(
		dayjs
			.duration({
				milliseconds: parseInt(value, 10) / 1000000,
			})
			.format('SSS'),
	).toFixed(2);

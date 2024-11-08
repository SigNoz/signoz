import { ManipulateType } from 'dayjs';

const MAX_RPS_LIMIT = 100;
export { MAX_RPS_LIMIT };

export const LEGEND = 'legend';

export const DAYJS_MANIPULATE_TYPES: { [key: string]: ManipulateType } = {
	DAY: 'day',
	WEEK: 'week',
	MONTH: 'month',
	YEAR: 'year',
	HOUR: 'hour',
	MINUTE: 'minute',
	SECOND: 'second',
	MILLISECOND: 'millisecond',
};

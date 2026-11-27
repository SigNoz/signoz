import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { renderHook } from 'tests/test-utils';

import useTimezoneFormatter from './useTimezoneFormatter';

const KOLKATA: Timezone = {
	name: 'India Standard Time',
	value: 'Asia/Kolkata',
	offset: 'UTC+05:30',
	searchIndex: 'india standard time',
};

const TIMESTAMP = '2026-11-27T05:09:01.634Z';

describe('useTimezoneFormatter', () => {
	it('formats one timestamp in each requested format', () => {
		const { result } = renderHook(() =>
			useTimezoneFormatter({ userTimezone: KOLKATA }),
		);
		const { formatTimezoneAdjustedTimestamp } = result.current;

		expect(
			formatTimezoneAdjustedTimestamp(
				TIMESTAMP,
				DATE_TIME_FORMATS.ISO_DATETIME_MS,
			),
		).toBe('2026-11-27 10:39:01.634');
		expect(
			formatTimezoneAdjustedTimestamp(TIMESTAMP, DATE_TIME_FORMATS.TIME),
		).toBe('10:39');
		expect(
			formatTimezoneAdjustedTimestamp(TIMESTAMP, DATE_TIME_FORMATS.MONTH_DAY),
		).toBe('Nov 27');
	});
});

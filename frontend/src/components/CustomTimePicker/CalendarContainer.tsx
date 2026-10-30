import { useState } from 'react';
import { Calendar } from '@signozhq/ui/calendar';
import { Button } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { Calendar as CalendarIcon, Check, X } from '@signozhq/icons';
import { useTimezone } from 'providers/Timezone';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';

import { DateRange } from './CustomTimePickerPopoverContent';
import {
	isValidTime,
	toCalendarDate,
	toZonedDateTime,
} from './aroundTimeUtils';
import TimeInput from './TimeInput';

const pad = (n: number): string => String(n).padStart(2, '0');

function CalendarContainer({
	dateRange,
	onSelectDateRange,
	onCancel,
	onApply,
	initialFrom,
	initialTo,
}: {
	dateRange: DateRange;
	onSelectDateRange: (dateRange: DateRange) => void;
	onCancel: () => void;
	onApply: (range: DateTimeRangeType) => void;
	/** Exact start timestamp to seed the time inputs on mount */
	initialFrom?: Date;
	/** Exact end timestamp to seed the time inputs on mount */
	initialTo?: Date;
}): JSX.Element {
	const { timezone } = useTimezone();

	const [startHour, setStartHour] = useState(() =>
		initialFrom ? pad(dayjs(initialFrom).tz(timezone.value).hour()) : '00',
	);
	const [startMinute, setStartMinute] = useState(() =>
		initialFrom ? pad(dayjs(initialFrom).tz(timezone.value).minute()) : '00',
	);
	const [startSecond, setStartSecond] = useState(() =>
		initialFrom ? pad(dayjs(initialFrom).tz(timezone.value).second()) : '00',
	);
	const [endHour, setEndHour] = useState(() =>
		initialTo ? pad(dayjs(initialTo).tz(timezone.value).hour()) : '23',
	);
	const [endMinute, setEndMinute] = useState(() =>
		initialTo ? pad(dayjs(initialTo).tz(timezone.value).minute()) : '59',
	);
	const [endSecond, setEndSecond] = useState(() =>
		initialTo ? pad(dayjs(initialTo).tz(timezone.value).second()) : '59',
	);

	const from =
		dateRange?.from && isValidTime(startHour, startMinute, startSecond)
			? toZonedDateTime(
					dateRange.from,
					{ hour: startHour, minute: startMinute, second: startSecond },
					timezone.value,
				)
			: null;
	const to =
		dateRange?.to && isValidTime(endHour, endMinute, endSecond)
			? toZonedDateTime(
					dateRange.to,
					{ hour: endHour, minute: endMinute, second: endSecond },
					timezone.value,
				).millisecond(999)
			: null;
	const canApply = !!(from?.isValid() && to?.isValid() && from.isBefore(to));
	const reversedRange = !!(from && to && !from.isBefore(to));

	// this is to override the default behavior of the shadcn calendar component
	// if a range is already selected, clicking on a date will reset selection and set the new date as the start date
	const handleSelect = (
		_selected: DateRange | undefined,
		clickedDate?: Date,
	): void => {
		if (!clickedDate) {
			return;
		}

		if (!dateRange?.from) {
			onSelectDateRange({ from: clickedDate });
			return;
		}

		if (dateRange.from && !dateRange.to) {
			if (clickedDate < dateRange.from) {
				onSelectDateRange({ from: clickedDate, to: dateRange.from });
			} else {
				onSelectDateRange({ from: dateRange.from, to: clickedDate });
			}
			return;
		}

		onSelectDateRange({ from: clickedDate, to: undefined });
	};

	const handleApply = (): void => {
		if (!canApply || !from || !to) {
			return;
		}

		onApply([from, to]);
	};

	return (
		<div className="calendar-container">
			<div className="calendar-container-header">
				<CalendarIcon size={12} />
				<div className="calendar-container-header-title">
					{dayjs(dateRange?.from).format(DATE_TIME_FORMATS.MONTH_DATE_SHORT)} -{' '}
					{dayjs(dateRange?.to).format(DATE_TIME_FORMATS.MONTH_DATE_SHORT)}
				</div>
			</div>

			<div className="calendar-container-body">
				<Calendar
					mode="range"
					required
					defaultMonth={dateRange?.from}
					selected={dateRange}
					disabled={{
						after: toCalendarDate(new Date(), timezone.value),
					}}
					onSelect={handleSelect}
				/>

				<div className="calendar-time-inputs">
					<TimeInput
						hour={startHour}
						minute={startMinute}
						second={startSecond}
						onHourChange={setStartHour}
						onMinuteChange={setStartMinute}
						onSecondChange={setStartSecond}
						date={dateRange?.from}
						label="Start"
						testIdPrefix="range-start"
					/>
					<TimeInput
						hour={endHour}
						minute={endMinute}
						second={endSecond}
						onHourChange={setEndHour}
						onMinuteChange={setEndMinute}
						onSecondChange={setEndSecond}
						date={dateRange?.to}
						label="End"
						testIdPrefix="range-end"
					/>
				</div>

				{reversedRange && (
					<div role="alert">End time must be after start time.</div>
				)}

				<div className="calendar-actions">
					<Button
						type="primary"
						className="periscope-btn secondary cancel-btn"
						onClick={onCancel}
						icon={<X size={12} />}
					>
						Cancel
					</Button>
					<Button
						type="primary"
						className="periscope-btn primary apply-btn"
						disabled={!canApply}
						onClick={handleApply}
						icon={<Check size={12} />}
					>
						Apply
					</Button>
				</div>
			</div>
		</div>
	);
}

export default CalendarContainer;

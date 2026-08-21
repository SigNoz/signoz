import { useState } from 'react';
import { Calendar } from '@signozhq/ui/calendar';
import { Button } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { Calendar as CalendarIcon, Check, X } from '@signozhq/icons';
import { useTimezone } from 'providers/Timezone';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';

import { DateRange } from './CustomTimePickerPopoverContent';
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

	const bothDatesSelected = !!(dateRange?.from && dateRange?.to);

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
		if (!dateRange?.from || !dateRange?.to) {
			return;
		}

		const clamp = (val: string, max: number): number => {
			const n = parseInt(val, 10);
			if (Number.isNaN(n)) {
				return 0;
			}
			return Math.min(Math.max(n, 0), max);
		};

		const from = dayjs(dateRange.from)
			.tz(timezone.value)
			.hour(clamp(startHour, 23))
			.minute(clamp(startMinute, 59))
			.second(clamp(startSecond, 59))
			.millisecond(0);

		const to = dayjs(dateRange.to)
			.tz(timezone.value)
			.hour(clamp(endHour, 23))
			.minute(clamp(endMinute, 59))
			.second(clamp(endSecond, 59))
			.millisecond(999);

		onApply([from, to]);
	};

	return (
		<div className="calendar-container">
			<div className="calendar-container-header">
				<CalendarIcon size={12} />
				<div className="calendar-container-header-title">
					{dayjs(dateRange?.from)
						.tz(timezone.value)
						.format(DATE_TIME_FORMATS.MONTH_DATE_SHORT)}{' '}
					-{' '}
					{dayjs(dateRange?.to)
						.tz(timezone.value)
						.format(DATE_TIME_FORMATS.MONTH_DATE_SHORT)}
				</div>
			</div>

			<div className="calendar-container-body">
				<Calendar
					mode="range"
					required
					defaultMonth={dateRange?.from}
					selected={dateRange}
					disabled={{
						after: dayjs().toDate(),
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
						disabled={!bothDatesSelected}
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

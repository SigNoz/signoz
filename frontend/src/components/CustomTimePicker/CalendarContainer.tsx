import { Calendar } from '@signozhq/calendar';
import { Button } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { CalendarIcon, Check, X } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { useState } from 'react';

import { DateRange } from './CustomTimePickerPopoverContent';

function CalendarContainer({
	dateRange,
	onSelectDateRange,
	onCancel,
	onApply,
}: {
	dateRange: DateRange;
	onSelectDateRange: (dateRange: DateRange) => void;
	onCancel: () => void;
	onApply: () => void;
}): JSX.Element {
	const { timezone } = useTimezone();
	const [range, setRange] = useState<DateRange | undefined>(dateRange);

	// this is to override the default behavior of the shadcn calendar component
	// if a range is already selected, clicking on a date will reset selection and set the new date as the start date
	const handleSelect = (
		_selected: DateRange | undefined,
		clickedDate?: Date,
	): void => {
		if (!clickedDate) {
			return;
		}

		// No dates selected → start new
		if (!range?.from) {
			setRange({ from: clickedDate });
			onSelectDateRange({ from: clickedDate });
			return;
		}

		// Only start selected → complete the range
		if (range.from && !range.to) {
			if (clickedDate < range.from) {
				setRange({ from: clickedDate, to: range.from });
				onSelectDateRange({ from: clickedDate, to: range.from });
			} else {
				setRange({ from: range.from, to: clickedDate });
				onSelectDateRange({ from: range.from, to: clickedDate });
			}
			return;
		}

		// Full range already selected → RESET
		setRange({ from: clickedDate, to: undefined });
		onSelectDateRange({ from: clickedDate, to: undefined });
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
					defaultMonth={range?.from}
					selected={range}
					disabled={{
						after: dayjs().toDate(),
					}}
					onSelect={handleSelect}
				/>

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
						onClick={onApply}
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

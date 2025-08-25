import './DatePickerV2.styles.scss';

import { Calendar } from '@signozhq/calendar';
import { Input } from '@signozhq/input';
import { Button, Tooltip } from 'antd';
import cx from 'classnames';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { LexicalContext } from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs, { Dayjs } from 'dayjs';
import { CornerUpLeft, MoveRight } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { addCustomTimeRange } from 'utils/customTimeRangeUtils';

function DatePickerV2({
	onSetCustomDTPickerVisible,
	setIsOpen,
	onCustomDateHandler,
}: {
	onSetCustomDTPickerVisible: (visible: boolean) => void;
	setIsOpen: (isOpen: boolean) => void;
	onCustomDateHandler: (
		dateTimeRange: DateTimeRangeType,
		lexicalContext?: LexicalContext,
	) => void;
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const timeInputRef = useRef<HTMLInputElement>(null);

	const { timezone } = useTimezone();

	const [selectedDateTimeFor, setSelectedDateTimeFor] = useState<'to' | 'from'>(
		'from',
	);

	const [selectedFromDateTime, setSelectedFromDateTime] = useState<Dayjs | null>(
		dayjs(minTime / 1000_000).tz(timezone.value),
	);

	const [selectedToDateTime, setSelectedToDateTime] = useState<Dayjs | null>(
		dayjs(maxTime / 1000_000).tz(timezone.value),
	);

	const handleNext = (): void => {
		if (selectedDateTimeFor === 'to') {
			onCustomDateHandler([selectedFromDateTime, selectedToDateTime]);

			addCustomTimeRange([selectedFromDateTime, selectedToDateTime]);

			setIsOpen(false);
			onSetCustomDTPickerVisible(false);
			setSelectedDateTimeFor('from');
		} else {
			setSelectedDateTimeFor('to');
		}
	};

	const handleDateChange = (date: Date | undefined): void => {
		if (!date) {
			return;
		}

		if (selectedDateTimeFor === 'from') {
			const prevFromDateTime = selectedFromDateTime;

			const newDate = dayjs(date);

			const updatedFromDateTime = prevFromDateTime
				? prevFromDateTime
						.year(newDate.year())
						.month(newDate.month())
						.date(newDate.date())
				: dayjs(date).tz(timezone.value);

			setSelectedFromDateTime(updatedFromDateTime);
		} else {
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSelectedToDateTime((prev) => {
				const newDate = dayjs(date);

				// Update only the date part, keeping time from existing state
				return prev
					? prev.year(newDate.year()).month(newDate.month()).date(newDate.date())
					: dayjs(date).tz(timezone.value);
			});
		}

		// focus the time input
		timeInputRef?.current?.focus();
	};

	const handleTimeChange = (time: string): void => {
		// time should have format HH:mm:ss
		if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
			return;
		}

		if (selectedDateTimeFor === 'from') {
			setSelectedFromDateTime((prev) => {
				if (prev) {
					return prev
						.set('hour', parseInt(time.split(':')[0], 10))
						.set('minute', parseInt(time.split(':')[1], 10))
						.set('second', parseInt(time.split(':')[2], 10));
				}

				return prev;
			});
		}
		if (selectedDateTimeFor === 'to') {
			// eslint-disable-next-line sonarjs/no-identical-functions
			setSelectedToDateTime((prev) => {
				if (prev) {
					return prev
						.set('hour', parseInt(time.split(':')[0], 10))
						.set('minute', parseInt(time.split(':')[1], 10))
						.set('second', parseInt(time.split(':')[2], 10));
				}

				return prev;
			});
		}
	};

	const getDefaultMonth = (): Date => {
		let defaultDate = null;

		if (selectedDateTimeFor === 'from') {
			defaultDate = selectedFromDateTime?.toDate();
		} else if (selectedDateTimeFor === 'to') {
			defaultDate = selectedToDateTime?.toDate();
		}

		return defaultDate ?? new Date();
	};

	const isValidRange = (): boolean => {
		if (selectedDateTimeFor === 'to') {
			return selectedToDateTime?.isAfter(selectedFromDateTime) ?? false;
		}

		return true;
	};

	const handleBack = (): void => {
		setSelectedDateTimeFor('from');
	};

	const handleHideCustomDTPicker = (): void => {
		onSetCustomDTPickerVisible(false);
	};

	const handleSelectDateTimeFor = (selectedDateTimeFor: 'to' | 'from'): void => {
		setSelectedDateTimeFor(selectedDateTimeFor);
	};

	return (
		<div className="date-picker-v2-container">
			<div className="date-time-custom-options-container">
				<div
					className="back-btn"
					onClick={handleHideCustomDTPicker}
					role="button"
					tabIndex={0}
					onKeyDown={(e): void => {
						if (e.key === 'Enter') {
							handleHideCustomDTPicker();
						}
					}}
				>
					<CornerUpLeft size={16} />
					<span>Back</span>
				</div>

				<div className="date-time-custom-options">
					<div
						role="button"
						tabIndex={0}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								handleSelectDateTimeFor('from');
							}
						}}
						className={cx(
							'date-time-custom-option-from',
							selectedDateTimeFor === 'from' && 'active',
						)}
						onClick={(): void => {
							handleSelectDateTimeFor('from');
						}}
					>
						<div className="date-time-custom-option-from-title">FROM</div>
						<div className="date-time-custom-option-from-value">
							{selectedFromDateTime?.format('YYYY-MM-DD HH:mm:ss')}
						</div>
					</div>
					<div
						role="button"
						tabIndex={0}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								handleSelectDateTimeFor('to');
							}
						}}
						className={cx(
							'date-time-custom-option-to',
							selectedDateTimeFor === 'to' && 'active',
						)}
						onClick={(): void => {
							handleSelectDateTimeFor('to');
						}}
					>
						<div className="date-time-custom-option-to-title">TO</div>
						<div className="date-time-custom-option-to-value">
							{selectedToDateTime?.format('YYYY-MM-DD HH:mm:ss')}
						</div>
					</div>
				</div>
			</div>
			<div className="custom-date-time-picker-v2">
				<Calendar
					mode="single"
					required
					selected={
						selectedDateTimeFor === 'from'
							? selectedFromDateTime?.toDate()
							: selectedToDateTime?.toDate()
					}
					key={selectedDateTimeFor + selectedDateTimeFor}
					onSelect={handleDateChange}
					defaultMonth={getDefaultMonth()}
					disabled={(current): boolean => {
						if (selectedDateTimeFor === 'to') {
							// disable dates after today and before selectedFromDateTime
							const currentDay = dayjs(current);
							return currentDay.isAfter(dayjs()) || false;
						}

						if (selectedDateTimeFor === 'from') {
							// disable dates after selectedToDateTime

							return dayjs(current).isAfter(dayjs()) || false;
						}

						return false;
					}}
					className="rounded-md border"
					navLayout="after"
				/>

				<div className="custom-time-selector">
					<label className="text-xs font-normal block" htmlFor="time-picker">
						Timestamp
					</label>

					<MoveRight size={16} />

					<div className="time-input-container">
						<Input
							type="time"
							ref={timeInputRef}
							className="time-input"
							value={
								selectedDateTimeFor === 'from'
									? selectedFromDateTime?.format('HH:mm:ss')
									: selectedToDateTime?.format('HH:mm:ss')
							}
							onChange={(e): void => handleTimeChange(e.target.value)}
							step="1"
						/>
					</div>
				</div>

				<div className="custom-date-time-picker-footer">
					{selectedDateTimeFor === 'to' && (
						<Button
							className="periscope-btn secondary clear-btn"
							type="default"
							onClick={handleBack}
						>
							Back
						</Button>
					)}
					<Tooltip
						title={
							!isValidRange() ? 'Invalid range: TO date should be after FROM date' : ''
						}
						overlayClassName="invalid-date-range-tooltip"
					>
						<Button
							className="periscope-btn primary next-btn"
							type="primary"
							onClick={handleNext}
							disabled={!isValidRange()}
						>
							{selectedDateTimeFor === 'from' ? 'Next' : 'Apply'}
						</Button>
					</Tooltip>
				</div>
			</div>
		</div>
	);
}

export default DatePickerV2;

import './CustomTimePicker.styles.scss';

import { Button, DatePicker } from 'antd';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	LexicalContext,
	Option,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs, { Dayjs } from 'dayjs';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

interface CustomTimePickerPopoverContentProps {
	options: any[];
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	customDateTimeVisible: boolean;
	setCustomDTPickerVisible: Dispatch<SetStateAction<boolean>>;
	onCustomDateHandler: (
		dateTimeRange: DateTimeRangeType,
		lexicalContext?: LexicalContext,
	) => void;
	onSelectHandler: (label: string, value: string) => void;
	handleGoLive: () => void;
	selectedTime: string;
}

function CustomTimePickerPopoverContent({
	options,
	setIsOpen,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	onSelectHandler,
	handleGoLive,
	selectedTime,
}: CustomTimePickerPopoverContentProps): JSX.Element {
	const { RangePicker } = DatePicker;
	const { pathname } = useLocation();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

	const disabledDate = (current: Dayjs): boolean => {
		const currentDay = dayjs(current);
		return currentDay.isAfter(dayjs());
	};

	const onPopoverClose = (visible: boolean): void => {
		if (!visible) {
			setCustomDTPickerVisible(false);
		}
		setIsOpen(visible);
	};

	const onModalOkHandler = (date_time: any): void => {
		if (date_time?.[1]) {
			onPopoverClose(false);
		}
		onCustomDateHandler(date_time, LexicalContext.CUSTOM_DATE_PICKER);
	};
	function getTimeChips(options: Option[]): JSX.Element {
		return (
			<div className="relative-date-time-section">
				{options.map((option) => (
					<Button
						type="text"
						className="time-btns"
						key={option.label + option.value}
						onClick={(): void => {
							onSelectHandler(option.label, option.value);
						}}
					>
						{option.label}
					</Button>
				))}
			</div>
		);
	}

	return (
		<div className="date-time-popover">
			<div className="date-time-options">
				{isLogsExplorerPage && (
					<Button className="data-time-live" type="text" onClick={handleGoLive}>
						Live
					</Button>
				)}
				{options.map((option) => (
					<Button
						type="text"
						key={option.label + option.value}
						onClick={(): void => {
							onSelectHandler(option.label, option.value);
						}}
						className={cx(
							'date-time-options-btn',
							selectedTime === option.value && 'active',
						)}
					>
						{option.label}
					</Button>
				))}
			</div>
			<div className="relative-date-time">
				{selectedTime === 'custom' || customDateTimeVisible ? (
					<RangePicker
						disabledDate={disabledDate}
						allowClear
						onCalendarChange={onModalOkHandler}
						// eslint-disable-next-line react/jsx-props-no-spreading
						{...(selectedTime === 'custom' && {
							defaultValue: [dayjs(minTime / 1000000), dayjs(maxTime / 1000000)],
						})}
					/>
				) : (
					<div>
						<div className="time-heading">RELATIVE TIMES</div>
						<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default CustomTimePickerPopoverContent;

import './CustomTimePicker.styles.scss';

import { Button, DatePicker } from 'antd';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	Option,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs, { Dayjs } from 'dayjs';
import { Info } from 'lucide-react';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface CustomTimePickerPopoverContentProps {
	options: any[];
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	customDateTimeVisible: boolean;
	setCustomDTPickerVisible: Dispatch<SetStateAction<boolean>>;
	onCustomDateHandler: (dateTimeRange: DateTimeRangeType) => void;
	onSelectHandler: (label: string, value: string) => void;
	handleGoLive: () => void;
}

function CustomTimePickerPopoverContent({
	options,
	setIsOpen,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	onSelectHandler,
	handleGoLive,
}: CustomTimePickerPopoverContentProps): JSX.Element {
	const { RangePicker } = DatePicker;
	const { pathname } = useLocation();

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
		onCustomDateHandler(date_time);
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
						className="date-time-options-btn"
					>
						{option.label}
					</Button>
				))}
			</div>
			<div className="relative-date-time">
				{customDateTimeVisible ? (
					<RangePicker
						disabledDate={disabledDate}
						allowClear
						onCalendarChange={onModalOkHandler}
					/>
				) : (
					<>
						<div>
							<div className="time-heading">RELATIVE TIMES</div>
							<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
						</div>
						<div>
							<Button type="text" icon={<Info />} className="info-text">
								Enter time in format (e.g., 1m, 2h, 3d, 4w)
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

export default CustomTimePickerPopoverContent;

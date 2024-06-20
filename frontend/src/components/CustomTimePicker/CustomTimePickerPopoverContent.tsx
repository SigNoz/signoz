import './CustomTimePicker.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	LexicalContext,
	Option,
	RelativeDurationSuggestionOptions,
	SemiRelativeDurationSuggestionOptions,
	SemiRelativeOption,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import RangePickerModal from './RangePickerModal';

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

dayjs.extend(isoWeek);
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
	const { pathname } = useLocation();

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

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

	function handleSemiRelativeTimes(option: SemiRelativeOption): void {
		let startTime;
		let endTime = dayjs();
		switch (option.value) {
			case 'smd':
				startTime = dayjs().startOf('day');
				break;
			case 'sw':
				startTime = dayjs().startOf('isoWeek');
				break;
			case 's6':
				startTime = dayjs().startOf('day').hour(6);
				break;
			case 'smn':
				startTime = dayjs().startOf('month');
				break;
			case 'pmn':
				startTime = dayjs().subtract(1, 'month').startOf('month');
				endTime = dayjs().subtract(1, 'month').endOf('month');
				break;
			default:
		}
		if (startTime) {
			onCustomDateHandler(
				[startTime, endTime],
				LexicalContext.CUSTOM_DATE_TIME_INPUT,
			);
			setIsOpen(false);
		}
	}

	function getSemiRelativeTimeChips(options: SemiRelativeOption[]): JSX.Element {
		return (
			<div className="relative-date-time-section">
				{options.map((option) => (
					<Button
						type="text"
						className="time-btns"
						key={option.label + option.value}
						onClick={(): void => {
							handleSemiRelativeTimes(option);
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
							customDateTimeVisible
								? option.value === 'custom' && 'active'
								: selectedTime === option.value && 'active',
						)}
					>
						{option.label}
					</Button>
				))}
			</div>
			<div
				className={cx(
					'relative-date-time',
					selectedTime === 'custom' || customDateTimeVisible
						? 'date-picker'
						: 'relative-times',
				)}
			>
				{selectedTime === 'custom' || customDateTimeVisible ? (
					<RangePickerModal
						setCustomDTPickerVisible={setCustomDTPickerVisible}
						setIsOpen={setIsOpen}
						onCustomDateHandler={onCustomDateHandler}
						selectedTime={selectedTime}
					/>
				) : (
					<div className="relative-options-time">
						<div className="relative-times-container">
							<div className="time-heading">RELATIVE TIMES</div>
							<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
						</div>
						<div className="relative-times-container">
							<div className="time-heading">SEMI RELATIVE TIMES</div>
							<div>
								{getSemiRelativeTimeChips(SemiRelativeDurationSuggestionOptions)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default CustomTimePickerPopoverContent;

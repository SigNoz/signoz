import './CustomTimePicker.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	LexicalContext,
	Option,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
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
					<div className="relative-times-container">
						<div className="time-heading">RELATIVE TIMES</div>
						<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default CustomTimePickerPopoverContent;

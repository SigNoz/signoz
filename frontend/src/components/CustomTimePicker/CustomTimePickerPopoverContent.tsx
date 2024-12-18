import './CustomTimePicker.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	LexicalContext,
	Option,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { Clock, PenLine } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import RangePickerModal from './RangePickerModal';
import TimezonePicker from './TimezonePicker';

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
	activeView: 'datetime' | 'timezone';
	setActiveView: Dispatch<SetStateAction<'datetime' | 'timezone'>>;
	isOpenedFromFooter: boolean;
	setIsOpenedFromFooter: Dispatch<SetStateAction<boolean>>;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function CustomTimePickerPopoverContent({
	options,
	setIsOpen,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	onSelectHandler,
	handleGoLive,
	selectedTime,
	activeView,
	setActiveView,
	isOpenedFromFooter,
	setIsOpenedFromFooter,
}: CustomTimePickerPopoverContentProps): JSX.Element {
	const { pathname } = useLocation();

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);
	const { timezone } = useTimezone();
	const activeTimezoneOffset = timezone.offset;

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

	const handleTimezoneHintClick = (): void => {
		setActiveView('timezone');
		setIsOpenedFromFooter(true);
		logEvent(
			'DateTimePicker: Timezone picker opened from time range picker footer',
			{
				page: pathname,
			},
		);
	};

	if (activeView === 'timezone') {
		return (
			<div className="date-time-popover">
				<TimezonePicker
					setActiveView={setActiveView}
					setIsOpen={setIsOpen}
					isOpenedFromFooter={isOpenedFromFooter}
				/>
			</div>
		);
	}

	return (
		<>
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

			<div className="date-time-popover__footer">
				<div className="timezone-container">
					<Clock
						color={Color.BG_VANILLA_400}
						className="timezone-container__clock-icon"
						height={12}
						width={12}
					/>
					<span className="timezone__icon">Current timezone</span>
					<div>⎯</div>
					<button
						type="button"
						className="timezone"
						onClick={handleTimezoneHintClick}
					>
						<span>{activeTimezoneOffset}</span>
						<PenLine
							color={Color.BG_VANILLA_100}
							className="timezone__icon"
							size={10}
						/>
					</button>
				</div>
			</div>
		</>
	);
}

export default CustomTimePickerPopoverContent;

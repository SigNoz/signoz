import './CustomTimePicker.styles.scss';

import { Calendar } from '@signozhq/calendar';
import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import {
	LexicalContext,
	Option,
	RelativeDurationSuggestionOptions,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs from 'dayjs';
import {
	CalendarIcon,
	Check,
	Clock,
	PenLine,
	TriangleAlertIcon,
	X,
} from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { getCustomTimeRanges } from 'utils/customTimeRangeUtils';
import { TimeRangeValidationResult } from 'utils/timeUtils';

import { CustomTimePickerInputStatus } from './CustomTimePicker';
import TimezonePicker from './TimezonePicker';

type DateRange = {
	from: Date | undefined;
	to?: Date | undefined;
};

interface CustomTimePickerPopoverContentProps {
	minTime: number;
	maxTime: number;
	options: any[];
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	customDateTimeVisible: boolean;
	setCustomDTPickerVisible: Dispatch<SetStateAction<boolean>>;
	onCustomDateHandler: (
		dateTimeRange: DateTimeRangeType,
		lexicalContext?: LexicalContext,
	) => void;
	onSelectHandler: (label: string, value: string) => void;
	onGoLive: () => void;
	selectedTime: string;
	activeView: 'datetime' | 'timezone';
	setActiveView: Dispatch<SetStateAction<'datetime' | 'timezone'>>;
	isOpenedFromFooter: boolean;
	setIsOpenedFromFooter: Dispatch<SetStateAction<boolean>>;
	onExitLiveLogs: () => void;
	showRecentlyUsed: boolean;
	customDateTimeInputStatus: CustomTimePickerInputStatus;
	inputErrorDetails: TimeRangeValidationResult['errorDetails'] | null;
}

interface RecentlyUsedDateTimeRange {
	label: string;
	value: number;
	timestamp: number;
	from: string;
	to: string;
}

const getDateRange = (
	minTime: number,
	maxTime: number,
	timezone: string,
): DateRange => {
	const from = dayjs(minTime / 1000_000)
		.tz(timezone)
		.startOf('day')
		.toDate();
	const to = dayjs(maxTime / 1000_000)
		.tz(timezone)
		.endOf('day')
		.toDate();

	return { from, to };
};

// eslint-disable-next-line sonarjs/cognitive-complexity
function CustomTimePickerPopoverContent({
	minTime,
	maxTime,
	options,
	setIsOpen,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	onSelectHandler,
	onGoLive,
	selectedTime,
	activeView,
	setActiveView,
	isOpenedFromFooter,
	setIsOpenedFromFooter,
	onExitLiveLogs,
	showRecentlyUsed = true,
	customDateTimeInputStatus = CustomTimePickerInputStatus.UNSET,
	inputErrorDetails,
}: CustomTimePickerPopoverContentProps): JSX.Element {
	const { pathname } = useLocation();

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

	const url = new URLSearchParams(window.location.search);

	const { timezone } = useTimezone();
	const activeTimezoneOffset = timezone.offset;

	let panelTypeFromURL = url.get(QueryParams.panelTypes);

	try {
		panelTypeFromURL = JSON.parse(panelTypeFromURL as string);
	} catch {
		// fallback → leave as-is
	}

	const isLogsListView =
		panelTypeFromURL !== 'table' && panelTypeFromURL !== 'graph'; // we do not select list view in the url

	const [dateRange, setDateRange] = useState<DateRange | undefined>(
		getDateRange(minTime, maxTime, timezone.value),
	);

	const [recentlyUsedTimeRanges, setRecentlyUsedTimeRanges] = useState<
		RecentlyUsedDateTimeRange[]
	>([]);

	const handleExitLiveLogs = useCallback((): void => {
		if (isLogsExplorerPage) {
			onExitLiveLogs();
		}
	}, [isLogsExplorerPage, onExitLiveLogs]);

	console.log('selected date range', selectedTime);

	useEffect(() => {
		if (!customDateTimeVisible) {
			const customTimeRanges = getCustomTimeRanges();

			const formattedCustomTimeRanges: RecentlyUsedDateTimeRange[] = customTimeRanges.map(
				(range) => ({
					label: `${dayjs(range.from)
						.tz(timezone.value)
						.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS)} - ${dayjs(range.to)
						.tz(timezone.value)
						.format(DATE_TIME_FORMATS.DD_MMM_YYYY_HH_MM_SS)}`,
					from: range.from,
					to: range.to,
					value: range.timestamp,
					timestamp: range.timestamp,
				}),
			);

			setRecentlyUsedTimeRanges(formattedCustomTimeRanges);
		}
	}, [customDateTimeVisible, timezone.value]);

	function getTimeChips(options: Option[]): JSX.Element {
		return (
			<div className="relative-date-time-section">
				{options.map((option) => (
					<Button
						type="text"
						className="time-btns"
						key={option.label + option.value}
						onClick={(): void => {
							handleExitLiveLogs();
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

	const handleGoLive = (): void => {
		onGoLive();
		setIsOpen(false);
	};

	const handleSelectDateRange = (dateRange: DateRange): void => {
		setDateRange(dateRange);
	};

	const handleCalendarRangeApply = (): void => {
		if (dateRange) {
			const from = dayjs(dateRange.from)
				.tz(timezone.value)
				.startOf('day')
				.toDate();
			const to = dayjs(dateRange.to).tz(timezone.value).endOf('day').toDate();

			onCustomDateHandler([dayjs(from), dayjs(to)]);
		}
		setIsOpen(false);
	};

	const handleCalendarRangeCancel = (): void => {
		setCustomDTPickerVisible(false);
	};

	return (
		<>
			<div className="date-time-popover">
				<div className="date-time-options">
					{isLogsExplorerPage && isLogsListView && (
						<Button className="data-time-live" type="text" onClick={handleGoLive}>
							Live
						</Button>
					)}
					{options.map((option) => (
						<Button
							type="text"
							key={option.label + option.value}
							onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
								e.stopPropagation();
								e.preventDefault();
								handleExitLiveLogs();
								onSelectHandler(option.label, option.value);
							}}
							className={cx(
								'date-time-options-btn',
								customDateTimeVisible
									? option.value === 'custom' && 'active'
									: selectedTime === option.value && 'active',
							)}
						>
							<span className="time-label">{option.label}</span>

							{option.value !== 'custom' && option.value !== '1month' && (
								<span className="time-value">{option.value}</span>
							)}
						</Button>
					))}
				</div>

				<div
					className={cx(
						'relative-date-time',
						customDateTimeVisible ? 'date-picker' : 'relative-times',
					)}
				>
					{customDateTimeVisible ? (
						<div className="calendar-container">
							<div className="calendar-container-header">
								<CalendarIcon size={16} />
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
									onSelect={handleSelectDateRange}
								/>

								<div className="calendar-actions">
									<Button
										type="primary"
										className="periscope-btn secondary cancel-btn"
										onClick={handleCalendarRangeCancel}
										icon={<X size={12} />}
									>
										Cancel
									</Button>
									<Button
										type="primary"
										className="periscope-btn primary apply-btn"
										onClick={handleCalendarRangeApply}
										icon={<Check size={12} />}
									>
										Apply
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="time-selector-container">
							{customDateTimeInputStatus === CustomTimePickerInputStatus.ERROR &&
								inputErrorDetails && (
									<div className="input-error-message-container">
										<div className="input-error-message-title">
											<TriangleAlertIcon color={Color.BG_CHERRY_400} size={16} />
											<span className="input-error-message-text">
												{inputErrorDetails.message}
											</span>
										</div>

										{inputErrorDetails.description && (
											<p className="input-error-message-description">
												{inputErrorDetails.description}
											</p>
										)}
									</div>
								)}

							<div className="relative-times-container">
								<div className="time-heading">RELATIVE TIMES</div>
								<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
							</div>

							{showRecentlyUsed && (
								<div className="recently-used-container">
									<div className="time-heading">RECENTLY USED</div>
									<div className="recently-used-range">
										{recentlyUsedTimeRanges.map((range: RecentlyUsedDateTimeRange) => (
											<div
												className="recently-used-range-item"
												role="button"
												tabIndex={0}
												onKeyDown={(e): void => {
													if (e.key === 'Enter' || e.key === ' ') {
														handleExitLiveLogs();
														onCustomDateHandler([dayjs(range.from), dayjs(range.to)]);
														setIsOpen(false);
													}
												}}
												key={range.value}
												onClick={(): void => {
													handleExitLiveLogs();
													onCustomDateHandler([dayjs(range.from), dayjs(range.to)]);
													setIsOpen(false);
												}}
											>
												{range.label}
											</div>
										))}
									</div>
								</div>
							)}
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

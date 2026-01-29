import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { RelativeDurationSuggestionOptions } from 'container/TopNav/DateTimeSelectionV2/constants';
import {
	LexicalContext,
	Option,
} from 'container/TopNav/DateTimeSelectionV2/types';
import dayjs from 'dayjs';
import { Clock, PenLine, TriangleAlertIcon } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import { getCustomTimeRanges } from 'utils/customTimeRangeUtils';
import { TimeRangeValidationResult } from 'utils/timeUtils';

import CalendarContainer from './CalendarContainer';
import { CustomTimePickerInputStatus } from './CustomTimePicker';
import TimezonePicker from './TimezonePicker';
import { Timezone } from './timezoneUtils';

import './CustomTimePicker.styles.scss';

const TO_MILLISECONDS_FACTOR = 1000_000;

export type DateRange = {
	from: Date | undefined;
	to?: Date | undefined;
};

interface CustomTimePickerPopoverContentProps {
	isLiveLogsEnabled: boolean;
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
	onTimezoneChange: (timezone: Timezone) => void;
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
	const from = dayjs(minTime / TO_MILLISECONDS_FACTOR)
		.tz(timezone)
		.startOf('day')
		.toDate();

	const to = dayjs(maxTime / TO_MILLISECONDS_FACTOR)
		.tz(timezone)
		.endOf('day')
		.toDate();

	return { from, to };
};

// eslint-disable-next-line sonarjs/cognitive-complexity
function CustomTimePickerPopoverContent({
	isLiveLogsEnabled,
	minTime,
	maxTime,
	options,
	setIsOpen,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	onSelectHandler,
	onTimezoneChange,
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

	const [dateRange, setDateRange] = useState<DateRange>(() =>
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
					onTimezoneSelect={onTimezoneChange}
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
						<Button
							className={cx('data-time-live', isLiveLogsEnabled ? 'active' : '')}
							type="text"
							onClick={handleGoLive}
						>
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
									? option.value === 'custom' && !isLiveLogsEnabled && 'active'
									: selectedTime === option.value && !isLiveLogsEnabled && 'active',
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
						<CalendarContainer
							dateRange={dateRange}
							onSelectDateRange={handleSelectDateRange}
							onCancel={handleCalendarRangeCancel}
							onApply={handleCalendarRangeApply}
						/>
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

							{showRecentlyUsed && recentlyUsedTimeRanges.length > 0 && (
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
					<div className="timezone-container__left">
						<Clock
							color={Color.BG_ROBIN_400}
							className="timezone-container__clock-icon"
							height={12}
							width={12}
						/>

						<span className="timezone__name">{timezone.name}</span>
						<span className="timezone__separator">⎯</span>
						<span className="timezone__offset">{activeTimezoneOffset}</span>
					</div>

					<div className="timezone-container__right">
						<Button
							type="text"
							size="small"
							className="periscope-btn text timezone-change-button"
							onClick={handleTimezoneHintClick}
							icon={<PenLine size={10} />}
						>
							Change Timezone
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}

export default CustomTimePickerPopoverContent;

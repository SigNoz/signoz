import './CustomTimePicker.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
import cx from 'classnames';
import DatePickerV2 from 'components/DatePickerV2/DatePickerV2';
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
import { Clock, PenLine } from 'lucide-react';
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
	onGoLive: () => void;
	selectedTime: string;
	activeView: 'datetime' | 'timezone';
	setActiveView: Dispatch<SetStateAction<'datetime' | 'timezone'>>;
	isOpenedFromFooter: boolean;
	setIsOpenedFromFooter: Dispatch<SetStateAction<boolean>>;
	onExitLiveLogs: () => void;
}

interface RecentlyUsedDateTimeRange {
	label: string;
	value: number;
	timestamp: number;
	from: string;
	to: string;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function CustomTimePickerPopoverContent({
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
}: CustomTimePickerPopoverContentProps): JSX.Element {
	const { pathname } = useLocation();

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

	const url = new URLSearchParams(window.location.search);

	let panelTypeFromURL = url.get(QueryParams.panelTypes);

	try {
		panelTypeFromURL = JSON.parse(panelTypeFromURL as string);
	} catch {
		// fallback → leave as-is
	}

	const isLogsListView =
		panelTypeFromURL !== 'table' && panelTypeFromURL !== 'graph'; // we do not select list view in the url

	const { timezone } = useTimezone();
	const activeTimezoneOffset = timezone.offset;

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
				/>
			</div>
		);
	}

	const handleGoLive = (): void => {
		onGoLive();
		setIsOpen(false);
	};

	return (
		<>
			<div className="date-time-popover">
				{!customDateTimeVisible && (
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
								onClick={(): void => {
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
								{option.label}
							</Button>
						))}
					</div>
				)}
				<div
					className={cx(
						'relative-date-time',
						customDateTimeVisible ? 'date-picker' : 'relative-times',
					)}
				>
					{customDateTimeVisible ? (
						<DatePickerV2
							onSetCustomDTPickerVisible={setCustomDTPickerVisible}
							setIsOpen={setIsOpen}
							onCustomDateHandler={onCustomDateHandler}
						/>
					) : (
						<div className="time-selector-container">
							<div className="relative-times-container">
								<div className="time-heading">RELATIVE TIMES</div>
								<div>{getTimeChips(RelativeDurationSuggestionOptions)}</div>
							</div>

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

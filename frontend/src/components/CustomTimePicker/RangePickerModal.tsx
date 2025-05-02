import './RangePickerModal.styles.scss';

import { DatePicker } from 'antd';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { LexicalContext } from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs, { Dayjs } from 'dayjs';
import { useTimezone } from 'providers/Timezone';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

interface RangePickerModalProps {
	setCustomDTPickerVisible: Dispatch<SetStateAction<boolean>>;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	onCustomDateHandler: (
		dateTimeRange: DateTimeRangeType,
		lexicalContext?: LexicalContext | undefined,
	) => void;
	selectedTime: string;
}

function RangePickerModal(props: RangePickerModalProps): JSX.Element {
	const {
		setCustomDTPickerVisible,
		setIsOpen,
		onCustomDateHandler,
		selectedTime,
	} = props;
	const { RangePicker } = DatePicker;
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// Using any type here because antd's DatePicker expects its own internal Dayjs type
	// which conflicts with our project's Dayjs type that has additional plugins (tz, utc etc).
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
	const disabledDate = (current: any): boolean => {
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
	const { timezone } = useTimezone();

	const rangeValue: [Dayjs, Dayjs] = useMemo(
		() => [
			dayjs(minTime / 1000_000).tz(timezone.value),
			dayjs(maxTime / 1000_000).tz(timezone.value),
		],
		[maxTime, minTime, timezone.value],
	);

	return (
		<div className="custom-date-picker">
			<RangePicker
				disabledDate={disabledDate}
				allowClear
				showTime
				format={(date: Dayjs): string =>
					date.tz(timezone.value).format(DATE_TIME_FORMATS.ISO_DATETIME)
				}
				onOk={onModalOkHandler}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...(selectedTime === 'custom' && {
					value: rangeValue,
				})}
			/>
		</div>
	);
}

export default RangePickerModal;

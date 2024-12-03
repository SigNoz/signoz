import './RangePickerModal.styles.scss';

import { DatePicker } from 'antd';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { LexicalContext } from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs, { Dayjs } from 'dayjs';
import { useTimezone } from 'providers/Timezone';
import { Dispatch, SetStateAction } from 'react';
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

	const { timezone } = useTimezone();
	return (
		<div className="custom-date-picker">
			<RangePicker
				disabledDate={disabledDate}
				allowClear
				showTime
				onOk={onModalOkHandler}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...(selectedTime === 'custom' && {
					defaultValue: [
						dayjs(minTime / 1000000).tz(timezone.value),
						dayjs(maxTime / 1000000).tz(timezone.value),
					],
				})}
			/>
		</div>
	);
}

export default RangePickerModal;

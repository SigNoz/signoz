import { DatePicker, Modal } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useState } from 'react';

export type DateTimeRangeType = [Dayjs | null, Dayjs | null] | null;

const { RangePicker } = DatePicker;

function CustomDateTimeModal({
	visible,
	onCreate,
	onCancel,
}: CustomDateTimeModalProps): JSX.Element {
	const [selectedDate, setDateTime] = useState<DateTimeRangeType>();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const onModalOkHandler = (date_time: any): void => {
		onCreate(date_time);
		setDateTime(date_time);
	};

	const disabledDate = (current: Dayjs): boolean => {
		const currentDay = dayjs(current);
		return currentDay.isAfter(dayjs());
	};

	const onOk = (): void => {
		if (selectedDate) onCreate(selectedDate);
	};

	return (
		<Modal
			open={visible}
			title="Chose date and time range"
			okText="Apply"
			cancelText="Cancel"
			onCancel={onCancel}
			onOk={onOk}
		>
			<RangePicker
				disabledDate={disabledDate}
				allowClear
				onOk={onModalOkHandler}
				showTime
				onCalendarChange={onModalOkHandler}
			/>
		</Modal>
	);
}

interface CustomDateTimeModalProps {
	visible: boolean;
	onCreate: (dateTimeRange: DateTimeRangeType) => void;
	onCancel: () => void;
}

export default CustomDateTimeModal;

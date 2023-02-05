/* eslint-disable react/jsx-no-bind */
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
	const [customDateTimeRange, setCustomDateTimeRange] = useState();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function handleRangePickerOk(date_time: any): void {
		setCustomDateTimeRange(date_time);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function disabledDate(current: any): boolean {
		const currentDay = dayjs(current);
		return currentDay.isAfter(dayjs());
	}

	return (
		<Modal
			open={visible}
			title="Chose date and time range"
			okText="Apply"
			cancelText="Cancel"
			onCancel={onCancel}
			style={{ position: 'absolute', top: 60, right: 40 }}
			onOk={(): void => onCreate(customDateTimeRange || null)}
		>
			<RangePicker
				disabledDate={disabledDate}
				onOk={handleRangePickerOk}
				showTime
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

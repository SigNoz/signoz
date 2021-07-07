import React, { useState } from 'react';
import { Modal, DatePicker } from 'antd';
import { DateTimeRangeType } from '../../../store/actions';
import { Moment } from 'moment';
import moment from 'moment';

const { RangePicker } = DatePicker;

interface CustomDateTimeModalProps {
	visible: boolean;
	onCreate: (dateTimeRange: DateTimeRangeType) => void; //Store is defined in antd forms library
	onCancel: () => void;
}

const CustomDateTimeModal: React.FC<CustomDateTimeModalProps> = ({
	//destructuring props
	visible,
	onCreate,
	onCancel,
}) => {
	// RangeValue<Moment> == [Moment|null,Moment|null]|null

	const [
		customDateTimeRange,
		setCustomDateTimeRange,
	] = useState<DateTimeRangeType>();

	function handleRangePickerOk(date_time: DateTimeRangeType) {
		setCustomDateTimeRange(date_time);
	}
	function disabledDate(current: Moment) {
		if (current > moment()) {
			return true;
		} else {
			return false;
		}
	}

	return (
		<Modal
			visible={visible}
			title="Chose date and time range"
			okText="Apply"
			cancelText="Cancel"
			onCancel={onCancel}
			style={{ position: 'absolute', top: 60, right: 40 }}
			onOk={() => onCreate(customDateTimeRange ? customDateTimeRange : null)}
		>
			<RangePicker
				disabledDate={disabledDate}
				onOk={handleRangePickerOk}
				showTime
			/>
		</Modal>
	);
};

export default CustomDateTimeModal;

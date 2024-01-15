/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './CustomTimePicker.styles.scss';

import { Input, Popover, Space, Tooltip } from 'antd';
import cx from 'classnames';
import { Options } from 'container/TopNav/DateTimeSelection/config';
import dayjs from 'dayjs';
import debounce from 'lodash-es/debounce';
import { CheckCircle, ChevronDown, Clock } from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

interface CustomTimePickerProps {
	onSelect: (value: string) => void;
	items: any[];
	selectedValue: string;
	selectedTime: string;
	onValidCustomDateChange: ([t1, t2]: any[]) => void;
}

function CustomTimePicker({
	onSelect,
	items,
	selectedValue,
	selectedTime,
	onValidCustomDateChange,
}: CustomTimePickerProps): JSX.Element {
	const [open, setOpen] = useState(false);
	const [
		selectedTimePlaceholderValue,
		setSelectedTimePlaceholderValue,
	] = useState('');

	const [inputValue, setInputValue] = useState('');
	const [inputStatus, setInputStatus] = useState<'' | 'error' | 'success'>('');
	const [isInputFocused, setIsInputFocused] = useState(false);

	const getSelectedTimeRangeLabel = (
		selectedTime: string,
		selectedTimeValue: string,
	): string => {
		if (selectedTime === 'custom') {
			return selectedTimeValue;
		}

		for (let index = 0; index < Options.length; index++) {
			if (Options[index].value === selectedTime) {
				return Options[index].label;
			}
		}

		return '';
	};

	useEffect(() => {
		const value = getSelectedTimeRangeLabel(selectedTime, selectedValue);

		setSelectedTimePlaceholderValue(value);
	}, [selectedTime, selectedValue]);

	const hide = (): void => {
		setOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setOpen(newOpen);
	};

	const debouncedHandleInputChange = debounce((inputValue): void => {
		const isValidFormat = /^(\d+)([mhdw])$/.test(inputValue);
		if (isValidFormat) {
			setInputStatus('success');

			const match = inputValue.match(/^(\d+)([mhdw])$/);

			const value = parseInt(match[1], 10);
			const unit = match[2];

			const currentTime = dayjs();
			let minTime = null;

			switch (unit) {
				case 'm':
					minTime = currentTime.subtract(value, 'minute');
					break;

				case 'h':
					minTime = currentTime.subtract(value, 'hour');
					break;
				case 'd':
					minTime = currentTime.subtract(value, 'day');
					break;
				case 'w':
					minTime = currentTime.subtract(value, 'week');
					break;
				default:
					break;
			}

			onValidCustomDateChange([minTime, currentTime]);
		} else {
			setInputStatus('error');
		}
	}, 300);

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const inputValue = event.target.value;

		if (inputValue.length > 0) {
			setOpen(false);
		} else {
			setOpen(true);
		}

		setInputValue(inputValue);

		// Call the debounced function with the input value
		debouncedHandleInputChange(inputValue);
	};

	const content = (
		<div
			className="time-selection-dropdown-content"
			style={{
				minWidth: '172px',
				width: '100%',
			}}
		>
			<div className="time-options-container">
				{items.map(({ value, label }) => (
					<div
						onClick={(): void => {
							onSelect(value);
							setSelectedTimePlaceholderValue(label);
							setInputStatus('');
							setInputValue('');
							hide();
						}}
						key={value}
						className={cx(
							'time-options-item',
							selectedValue === value ? 'active' : '',
						)}
					>
						{label}
					</div>
				))}
			</div>
		</div>
	);

	const handleFocus = (): void => {
		setIsInputFocused(true);
	};

	const handleBlur = (): void => {
		setIsInputFocused(false);
	};

	return (
		<Popover
			placement="bottomRight"
			getPopupContainer={popupContainer}
			content={content}
			arrow={false}
			open={open}
			onOpenChange={handleOpenChange}
			trigger={['click']}
			style={{
				padding: 0,
			}}
		>
			<Space.Compact
				style={{ width: '100%', minWidth: '240px', maxWidth: '240px' }}
			>
				<Input
					className="timeSelection-input"
					type="text"
					status={inputValue && inputStatus === 'error' ? 'error' : ''}
					allowClear={!isInputFocused && selectedTime === 'custom'}
					placeholder={
						isInputFocused
							? 'Time Format (1m or 2h or 3d or 4w)'
							: selectedTimePlaceholderValue || 'Select / Enter Time Range'
					}
					value={inputValue}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleInputChange}
					prefix={
						inputValue && inputStatus === 'success' ? (
							<CheckCircle size={14} color="#51E7A8" />
						) : (
							<Tooltip title="Enter time in format (e.g., 1m, 2h, 2d, 4w)">
								<Clock size={14} />
							</Tooltip>
						)
					}
					suffix={
						<ChevronDown
							size={14}
							onClick={(): void => {
								setOpen(!open);
							}}
						/>
					}
				/>
			</Space.Compact>
		</Popover>
	);
}

export default CustomTimePicker;

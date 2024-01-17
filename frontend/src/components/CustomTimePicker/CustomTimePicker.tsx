/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './CustomTimePicker.styles.scss';

import { Input, Popover, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { Options } from 'container/TopNav/DateTimeSelection/config';
import dayjs from 'dayjs';
import { defaultTo, noop } from 'lodash-es';
import debounce from 'lodash-es/debounce';
import { CheckCircle, ChevronDown, Clock } from 'lucide-react';
import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useEffect,
	useState,
} from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

import CustomTimePickerPopoverContent from './CustomTimePickerPopoverContent';

const maxAllowedMinTimeInMonths = 6;

interface CustomTimePickerProps {
	onSelect: (value: string) => void;
	onError: (value: boolean) => void;
	selectedValue: string;
	selectedTime: string;
	onValidCustomDateChange: ([t1, t2]: any[]) => void;
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
	items: any[];
	newPopover?: boolean;
	customDateTimeVisible?: boolean;
	setCustomDTPickerVisible?: Dispatch<SetStateAction<boolean>>;
	onCustomDateHandler?: (dateTimeRange: DateTimeRangeType) => void;
	handleGoLive?: () => void;
}

function CustomTimePicker({
	onSelect,
	onError,
	items,
	selectedValue,
	selectedTime,
	open,
	setOpen,
	onValidCustomDateChange,
	newPopover,
	customDateTimeVisible,
	setCustomDTPickerVisible,
	onCustomDateHandler,
	handleGoLive,
}: CustomTimePickerProps): JSX.Element {
	const [
		selectedTimePlaceholderValue,
		setSelectedTimePlaceholderValue,
	] = useState('Select / Enter Time Range');

	const [inputValue, setInputValue] = useState('');
	const [inputStatus, setInputStatus] = useState<'' | 'error' | 'success'>('');
	const [inputErrorMessage, setInputErrorMessage] = useState<string | null>(
		null,
	);
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
			onError(false);
			setInputErrorMessage(null);

			const match = inputValue.match(/^(\d+)([mhdw])$/);

			const value = parseInt(match[1], 10);
			const unit = match[2];

			const currentTime = dayjs();
			const maxAllowedMinTime = currentTime.subtract(
				maxAllowedMinTimeInMonths,
				'month',
			);
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

			if (minTime && minTime < maxAllowedMinTime) {
				setInputStatus('error');
				onError(true);
				setInputErrorMessage('Please enter time less than 6 months');
			} else {
				onValidCustomDateChange([minTime, currentTime]);
			}
		} else {
			setInputStatus('error');
			onError(true);
			setInputErrorMessage(null);
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

	const handleSelect = (label: string, value: string): void => {
		onSelect(value);
		setSelectedTimePlaceholderValue(label);
		setInputStatus('');
		onError(false);
		setInputErrorMessage(null);
		setInputValue('');
		if (value !== 'custom') {
			hide();
		}
	};

	const content = (
		<div className="time-selection-dropdown-content">
			<div className="time-options-container">
				{items?.map(({ value, label }) => (
					<div
						onClick={(): void => {
							handleSelect(label, value);
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
		<div className="custom-time-picker">
			<Popover
				className="timeSelection-input-container"
				placement="bottomRight"
				getPopupContainer={popupContainer}
				rootClassName="date-time-root"
				content={
					newPopover ? (
						<CustomTimePickerPopoverContent
							setIsOpen={setOpen}
							customDateTimeVisible={defaultTo(customDateTimeVisible, false)}
							setCustomDTPickerVisible={defaultTo(setCustomDTPickerVisible, noop)}
							onCustomDateHandler={defaultTo(onCustomDateHandler, noop)}
							onSelectHandler={handleSelect}
							handleGoLive={defaultTo(handleGoLive, noop)}
							options={items}
						/>
					) : (
						content
					)
				}
				arrow={false}
				trigger="hover"
				open={open}
				onOpenChange={handleOpenChange}
				style={{
					padding: 0,
				}}
			>
				<Input
					className="timeSelection-input"
					type="text"
					style={{
						minWidth: '120px',
						width: '100%',
					}}
					status={inputValue && inputStatus === 'error' ? 'error' : ''}
					allowClear={!isInputFocused && selectedTime === 'custom'}
					placeholder={
						isInputFocused
							? 'Time Format (1m or 2h or 3d or 4w)'
							: selectedTimePlaceholderValue
					}
					value={inputValue}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleInputChange}
					prefix={
						inputValue && inputStatus === 'success' ? (
							<CheckCircle size={14} color="#51E7A8" />
						) : (
							<Tooltip title="Enter time in format (e.g., 1m, 2h, 3d, 4w)">
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
			</Popover>

			{inputStatus === 'error' && inputErrorMessage && (
				<Typography.Title level={5} className="valid-format-error">
					{inputErrorMessage}
				</Typography.Title>
			)}
		</div>
	);
}

export default CustomTimePicker;

CustomTimePicker.defaultProps = {
	newPopover: false,
	customDateTimeVisible: false,
	setCustomDTPickerVisible: noop,
	onCustomDateHandler: noop,
	handleGoLive: noop,
};

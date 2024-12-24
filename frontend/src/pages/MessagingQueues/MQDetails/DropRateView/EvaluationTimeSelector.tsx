import './DropRateView.styles.scss';

import { Input, Select, Typography } from 'antd';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const { Option } = Select;

interface SelectDropdownRenderProps {
	menu: React.ReactNode;
	inputValue: string;
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	handleAddCustomValue: () => void;
}

function SelectDropdownRender({
	menu,
	inputValue,
	handleInputChange,
	handleAddCustomValue,
	handleKeyDown,
}: SelectDropdownRenderProps): JSX.Element {
	return (
		<>
			{menu}
			<Input
				placeholder="Enter custom time (ms)"
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				onBlur={handleAddCustomValue}
				className="select-dropdown-render"
			/>
		</>
	);
}

function EvaluationTimeSelector({
	setInterval,
}: {
	setInterval: Dispatch<SetStateAction<string>>;
}): JSX.Element {
	const [inputValue, setInputValue] = useState<string>('');
	const [selectedInterval, setSelectedInterval] = useState<string | null>(
		'10ms',
	);
	const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setInputValue(e.target.value);
	};

	const handleSelectChange = (value: string): void => {
		setSelectedInterval(value);
		setInputValue('');
		setDropdownOpen(false);
	};

	const handleAddCustomValue = (): void => {
		setSelectedInterval(inputValue);
		setInputValue(inputValue);
		setDropdownOpen(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			handleAddCustomValue();
		}
	};

	const renderDropdown = (menu: React.ReactNode): JSX.Element => (
		<SelectDropdownRender
			menu={menu}
			inputValue={inputValue}
			handleInputChange={handleInputChange}
			handleAddCustomValue={handleAddCustomValue}
			handleKeyDown={handleKeyDown}
		/>
	);

	useEffect(() => {
		if (selectedInterval) {
			setInterval(() => selectedInterval);
		}
	}, [selectedInterval, setInterval]);

	return (
		<div className="evaluation-time-selector">
			<Typography.Text className="eval-title">
				Evaluation Interval:
			</Typography.Text>
			<Select
				style={{ width: 220 }}
				placeholder="Select time interval (ms)"
				value={selectedInterval}
				onChange={handleSelectChange}
				open={dropdownOpen}
				onDropdownVisibleChange={setDropdownOpen}
				dropdownRender={renderDropdown}
			>
				<Option value="10ms">10ms</Option>
				<Option value="20ms">20ms</Option>
				<Option value="50ms">50ms</Option>
				<Option value="100ms">100ms</Option>
				<Option value="150ms">150ms</Option>
				<Option value="200ms">200ms</Option>
				<Option value="500ms">500ms</Option>
			</Select>
		</div>
	);
}

export default EvaluationTimeSelector;

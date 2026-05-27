import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Input } from 'antd';
import {
	Combobox,
	ComboboxCommand,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
} from '@signozhq/ui/combobox';
import { Typography } from '@signozhq/ui/typography';

import './DropRateView.styles.scss';

const INTERVAL_OPTIONS = [
	'10ms',
	'20ms',
	'50ms',
	'100ms',
	'150ms',
	'200ms',
	'500ms',
];

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
		if (!inputValue) {
			return;
		}
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
			<Combobox open={dropdownOpen} onOpenChange={setDropdownOpen}>
				<ComboboxTrigger
					style={{ width: 220 }}
					placeholder="Select time interval (ms)"
					value={selectedInterval ?? undefined}
				/>
				<ComboboxContent>
					<ComboboxCommand shouldFilter={false}>
						<ComboboxList>
							{INTERVAL_OPTIONS.map((option) => (
								<ComboboxItem
									key={option}
									value={option}
									isSelected={selectedInterval === option}
									onSelect={(): void => handleSelectChange(option)}
								>
									{option}
								</ComboboxItem>
							))}
							<ComboboxEmpty>No results found.</ComboboxEmpty>
						</ComboboxList>
						<Input
							placeholder="Enter custom time (ms)"
							value={inputValue}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							onBlur={handleAddCustomValue}
							className="select-dropdown-render"
						/>
					</ComboboxCommand>
				</ComboboxContent>
			</Combobox>
		</div>
	);
}

export default EvaluationTimeSelector;

import './DropdownWithSubMenu.styles.scss';

import { CheckOutlined } from '@ant-design/icons';
import { Button, Checkbox, Popover, Typography } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { FormInstance } from 'antd/lib';
import { useEffect, useState } from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

import { recurrenceOptions } from '../PlannedDowntimeutils';

interface SubOption {
	label: string;
	value: string;
}

export interface Option {
	label: string;
	value: string;
	submenu?: SubOption[];
}

interface DropdownProps {
	options: Option[];
	form: FormInstance<any>;
	setRecurrenceOption: React.Dispatch<
		React.SetStateAction<string | undefined | null>
	>;
}

export function DropdownWithSubMenu(props: DropdownProps): JSX.Element {
	const { options, form, setRecurrenceOption } = props;
	const [selectedOption, setSelectedOption] = useState<Option | null>(
		form.getFieldValue('recurrenceSelect')
			? form.getFieldValue('recurrenceSelect').repeatType
			: recurrenceOptions.doesNotRepeat,
	);
	const [selectedSubMenuOption, setSelectedSubMenuOption] = useState<string[]>(
		[],
	);
	const [isOpen, setIsOpen] = useState(false);
	const [isSubMenuOpen, setSubMenuIsOpen] = useState(false);
	const [selectionCompleted, setSelectionCompleted] = useState(false);

	useEffect(() => setRecurrenceOption?.(selectedOption?.value), [
		selectedOption,
		setRecurrenceOption,
	]);

	const handleSelectOption = (option: Option): void => {
		setSelectedOption(option);
		if (isSubMenuOpen && !option.submenu?.length) {
			setSubMenuIsOpen(false);
			setSelectionCompleted(true);
		} else {
			setIsOpen(!!option.submenu?.length);
			setSelectionCompleted(false);
		}
	};

	useEffect(() => {
		form.setFieldValue('recurrenceSelect', {
			repeatType: selectedOption,
			repeatOn: selectedOption?.value === 'weekly' ? selectedSubMenuOption : [],
		});
	}, [form, selectedOption, selectedSubMenuOption]);

	const handleInputChange = (): void => {
		setIsOpen(true);
	};

	const handleOptionKeyDown = (
		e: React.KeyboardEvent<HTMLDivElement>,
		option: Option,
	): void => {
		if (e.key === 'Enter') {
			handleSelectOption(option);
		}
	};

	const handleCheckboxChange = (
		event: CheckboxChangeEvent,
		value: string,
	): void => {
		const { checked } = event.target;
		let selectedSubMenuOptions: string[] = [...(selectedSubMenuOption || [])];
		if (!checked) {
			selectedSubMenuOptions = selectedSubMenuOptions.filter(
				(item) => item !== value,
			);
		} else {
			selectedSubMenuOptions.push(value);
		}

		setSelectedSubMenuOption(selectedSubMenuOptions);
	};

	const handleSaveOptionClick = (): void => {
		setSubMenuIsOpen(false);
		setSelectionCompleted(true);
	};

	useEffect(() => {
		if (selectionCompleted) {
			setIsOpen(false);
		}
	}, [selectionCompleted]);

	return (
		<div className="dropdown-submenu">
			<Popover
				getPopupContainer={popupContainer}
				open={isOpen}
				onOpenChange={(visible): void => {
					if (!visible) {
						setSubMenuIsOpen(false);
					}
				}}
				content={
					<div className="options-container">
						<div className="options">
							{options.map((option) => {
								if (option.value === recurrenceOptions.weekly.value) {
									return (
										<Popover
											key={option.value}
											placement="right"
											arrow={false}
											trigger="click"
											rootClassName="submenu-popover"
											autoAdjustOverflow
											open={isSubMenuOpen}
											content={
												<div className="submenu-container">
													<Typography.Text className="submenu-header">
														repeats weekly on
													</Typography.Text>
													{option.submenu?.map((subMenuOption) => (
														<Checkbox
															onChange={(e): void =>
																handleCheckboxChange(e, subMenuOption.value)
															}
															className="submenu-checkbox"
															key={subMenuOption.value}
														>
															{subMenuOption.label}
														</Checkbox>
													))}
													<Button
														icon={<CheckOutlined />}
														type="primary"
														className="save-option-btn"
														onClick={handleSaveOptionClick}
													>
														Save
													</Button>
												</div>
											}
										>
											<div
												key={option.value}
												className="option"
												role="option"
												aria-selected={selectedOption === option}
												tabIndex={0}
												onClick={(): void => {
													handleSelectOption(option);
													setSubMenuIsOpen(true);
												}}
												onKeyDown={(e): void => handleOptionKeyDown(e, option)}
											>
												{option.label}
											</div>
										</Popover>
									);
								}
								return (
									<div
										key={option.value}
										className="option"
										role="option"
										aria-selected={selectedOption === option}
										tabIndex={0}
										onClick={(): void => {
											handleSelectOption(option);
										}}
										onKeyDown={(e): void => handleOptionKeyDown(e, option)}
									>
										{option.label}
									</div>
								);
							})}
						</div>
					</div>
				}
				trigger="click"
				arrow={false}
				autoAdjustOverflow
				placement="bottom"
			>
				<input
					type="text"
					placeholder="Select option..."
					className="dropdown-input"
					value={selectedOption?.label}
					onChange={handleInputChange}
					onClick={(): void => setIsOpen(true)}
				/>
			</Popover>
		</div>
	);
}

export const recurrenceOption: Option[] = [
	recurrenceOptions.doesNotRepeat,
	recurrenceOptions.daily,
	{
		...recurrenceOptions.weekly,
		submenu: [
			{ label: 'Monday', value: 'monday' },
			{ label: 'Tuesday', value: 'tuesday' },
			{ label: 'Wednesday', value: 'wednesday' },
			{ label: 'Thrusday', value: 'thrusday' },
			{ label: 'Friday', value: 'friday' },
			{ label: 'Saturday', value: 'saturday' },
			{ label: 'Sunday', value: 'sunday' },
		],
	},
	recurrenceOptions.monthly,
];

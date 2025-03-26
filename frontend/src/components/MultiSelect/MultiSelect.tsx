/* eslint-disable sonarjs/cognitive-complexity */
import './MultiSelect.styles.scss';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Checkbox, Input, Spin } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { InputRef } from 'antd/lib/input';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface MultiSelectOption {
	label: string;
	value: string;
	selected?: boolean;
	disabled?: boolean;
}

export interface MultiSelectSection {
	title: string;
	options: MultiSelectOption[];
}

export interface MultiSelectProps {
	/** Array of options to display in the dropdown */
	options: MultiSelectOption[];
	/** Callback when selected values change */
	onChange: (selectedValues: string[]) => void;
	/** Currently selected values */
	value?: string[];
	/** Placeholder text for the search input */
	placeholder?: string;
	/** Whether the component is in loading state */
	loading?: boolean;
	/** Allow users to add custom values */
	allowCustomValues?: boolean;
	/** Callback when search text changes - can be used for server filtering */
	onSearch?: (searchText: string) => void;
	/** Custom class name */
	className?: string;
	/** Additional sections to display (e.g., "Related Values") */
	additionalSections?: MultiSelectSection[];
	/** Show "Select All" option */
	showSelectAll?: boolean;
	/** Maximum height of dropdown in pixels */
	dropdownMaxHeight?: number;
	/** Maximum width of dropdown in pixels (defaults to matching input width) */
	dropdownMaxWidth?: number;
	/** Disable the component */
	disabled?: boolean;
	/** Error message to display */
	error?: string;
	/** Label text */
	label?: string;
	/** Allow users to clear all selections */
	allowClear?: boolean;
	/** Maximum height of a section */
	sectionMaxHeight?: number;
}

function MultiSelect({
	options,
	onChange,
	value = [],
	placeholder = 'Search...',
	loading = false,
	allowCustomValues = true,
	onSearch,
	className = '',
	additionalSections = [],
	showSelectAll = true,
	dropdownMaxHeight = 400,
	dropdownMaxWidth,
	disabled = false,
	error,
	label,
	allowClear = true,
	sectionMaxHeight = 150,
}: MultiSelectProps): JSX.Element {
	const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
	const [searchText, setSearchText] = useState<string>('');
	const [selectedValues, setSelectedValues] = useState<string[]>(value);
	const [displayOptions, setDisplayOptions] = useState<MultiSelectOption[]>(
		options,
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<InputRef>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [focusedChipIndex, setFocusedChipIndex] = useState<number>(-1);
	const chipRefs = useRef<(HTMLDivElement | null)[]>([]);

	// Handle save action - memoize with useCallback
	const handleSave = useCallback((): void => {
		setIsDropdownOpen(false);
		setSearchText('');
		onChange(selectedValues);
	}, [onChange, selectedValues]);

	// Synchronize value prop with internal state
	useEffect(() => {
		setSelectedValues(value);
	}, [value]);

	// Filter and sort options based on search text
	useEffect(() => {
		// Filter options based on search text
		const filteredOptions = options.filter((option) =>
			option.label.toLowerCase().includes(searchText.toLowerCase()),
		);

		// Add custom value option if no matches found and allowCustomValues is true
		if (
			allowCustomValues &&
			searchText &&
			!filteredOptions.some(
				(option) => option.label.toLowerCase() === searchText.toLowerCase(),
			) &&
			!filteredOptions.some(
				(option) => option.value.toLowerCase() === searchText.toLowerCase(),
			)
		) {
			filteredOptions.unshift({
				label: `Add "${searchText}"`,
				value: searchText,
			});
		}

		// Sort options: selected first, then matching search term
		const sortedOptions = [...filteredOptions].sort((a, b) => {
			// First by selection status
			if (selectedValues.includes(a.value) && !selectedValues.includes(b.value))
				return -1;
			if (!selectedValues.includes(a.value) && selectedValues.includes(b.value))
				return 1;

			// Then by match position (exact matches or starts with come first)
			const aLower = a.label.toLowerCase();
			const bLower = b.label.toLowerCase();
			const searchLower = searchText.toLowerCase();

			if (aLower === searchLower && bLower !== searchLower) return -1;
			if (aLower !== searchLower && bLower === searchLower) return 1;
			if (aLower.startsWith(searchLower) && !bLower.startsWith(searchLower))
				return -1;
			if (!aLower.startsWith(searchLower) && bLower.startsWith(searchLower))
				return 1;

			return 0;
		});

		setDisplayOptions(sortedOptions);
	}, [options, searchText, selectedValues, allowCustomValues]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent): void => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				handleSave();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return (): void => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [selectedValues, handleSave]);

	// Adjust dropdown position if needed
	useEffect(() => {
		if (isDropdownOpen && dropdownRef.current && containerRef.current) {
			const containerRect = containerRef.current.getBoundingClientRect();
			const dropdownHeight = dropdownRef.current.offsetHeight;
			const viewportHeight = window.innerHeight;

			// Check if dropdown extends beyond viewport bottom
			if (
				containerRect.bottom + dropdownHeight > viewportHeight &&
				containerRect.top > dropdownHeight
			) {
				dropdownRef.current.style.top = 'auto';
				dropdownRef.current.style.bottom = '100%';
				dropdownRef.current.style.marginTop = '0';
				dropdownRef.current.style.marginBottom = '4px';
			}
		}
	}, [isDropdownOpen, displayOptions]);

	// Handle search input change
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const text = e.target.value;
		setSearchText(text);
		if (onSearch) {
			onSearch(text);
		}
	};

	// Handle selection change
	const handleSelectionChange = (
		option: MultiSelectOption,
		e: CheckboxChangeEvent,
	): void => {
		const { checked } = e.target;
		let newSelectedValues: string[];

		if (checked) {
			newSelectedValues = [...selectedValues, option.value];
		} else {
			newSelectedValues = selectedValues.filter((val) => val !== option.value);
		}

		setSelectedValues(newSelectedValues);
	};

	// Handle "All" checkbox change
	const handleSelectAll = (e: CheckboxChangeEvent): void => {
		if (e.target.checked) {
			const allValues = options
				.filter((option) => !option.disabled)
				.map((option) => option.value);
			setSelectedValues(allValues);
		} else {
			setSelectedValues([]);
		}
	};

	// Remove a selected item
	const handleRemoveItem = useCallback(
		(value: string): void => {
			const newSelectedValues = selectedValues.filter((val) => val !== value);
			setSelectedValues(newSelectedValues);
		},
		[selectedValues],
	);

	// Handle clicking the input area
	const handleInputClick = (): void => {
		if (!disabled) {
			setIsDropdownOpen(true);
			inputRef.current?.focus();
		}
	};

	// Handle clear all selections
	const handleClearAll = (): void => {
		setSelectedValues([]);
		setSearchText('');
		inputRef.current?.focus();
	};

	// Get display value of a selection (chips)
	const getSelectedOptions = (): MultiSelectOption[] =>
		selectedValues.map((value) => {
			const option = options.find((opt) => opt.value === value);
			return {
				label: option?.label || value,
				value,
			};
		});

	const selectedOptions = getSelectedOptions();
	const allSelectableOptions = options.filter((option) => !option.disabled);
	const allSelected =
		allSelectableOptions.length > 0 &&
		selectedValues.length === allSelectableOptions.length;

	const containerClasses = [
		'multi-select-container',
		className,
		disabled ? 'multi-select-disabled' : '',
		error ? 'multi-select-error' : '',
	]
		.filter(Boolean)
		.join(' ');

	const inputClasses = [
		'multi-select-input',
		isDropdownOpen ? 'multi-select-input-focused' : '',
	]
		.filter(Boolean)
		.join(' ');

	// Reset chip refs array when selected options change
	useEffect(() => {
		chipRefs.current = Array(selectedOptions.length).fill(null);
	}, [selectedOptions.length]);

	// Handle chip keyboard navigation
	const handleChipKeyDown = useCallback(
		(e: React.KeyboardEvent, index: number) => {
			e.stopPropagation(); // Prevent bubbling to container

			switch (e.key) {
				case 'ArrowLeft':
					e.preventDefault();
					// Move focus to previous chip
					if (index > 0) {
						setFocusedChipIndex(index - 1);
					}
					break;

				case 'ArrowRight':
					e.preventDefault();
					// Move focus to next chip or input
					if (index < selectedOptions.length - 1) {
						setFocusedChipIndex(index + 1);
					} else {
						// Focus the input when at the last chip
						setFocusedChipIndex(-1);
						inputRef.current?.focus();
					}
					break;

				case 'Delete':
				case 'Backspace':
					e.preventDefault();
					// Remove current chip
					handleRemoveItem(selectedOptions[index].value);

					// Adjust focus after deletion
					if (selectedOptions.length > 1) {
						// Focus previous chip if not at beginning
						const newIndex = Math.min(index, selectedOptions.length - 2);
						setFocusedChipIndex(newIndex);
					} else {
						// If this was the last chip, focus input
						setFocusedChipIndex(-1);
						inputRef.current?.focus();
					}
					break;

				case 'Escape':
					e.preventDefault();
					// Return focus to input
					setFocusedChipIndex(-1);
					inputRef.current?.focus();
					break;
				default:
					// No-op for unhandled keys
					break;
			}
		},
		[selectedOptions, handleRemoveItem],
	);

	// Handle key events in the input
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			// Add custom value on Enter if it doesn't exist
			if (
				allowCustomValues &&
				searchText &&
				!options.some(
					(option) => option.value.toLowerCase() === searchText.toLowerCase(),
				) &&
				!options.some(
					(option) => option.label.toLowerCase() === searchText.toLowerCase(),
				)
			) {
				const newSelectedValues = [...selectedValues, searchText];
				setSelectedValues(newSelectedValues);
				setSearchText('');
			} else if (isDropdownOpen) {
				handleSave();
			}
		} else if (e.key === 'Escape') {
			handleSave();
		} else if (
			e.key === 'Backspace' &&
			!searchText &&
			selectedValues.length > 0
		) {
			// Remove the last selected item when pressing backspace in an empty input
			const newSelectedValues = [...selectedValues];
			newSelectedValues.pop();
			setSelectedValues(newSelectedValues);
		} else if (e.key === 'Tab' && isDropdownOpen) {
			// Close dropdown but keep focus within component
			e.preventDefault();
			handleSave();
		}

		// Add navigation TO chips when in input field
		if (e.key === 'ArrowLeft' && !searchText && selectedOptions.length > 0) {
			e.preventDefault();
			setFocusedChipIndex(selectedOptions.length - 1);
		}
	};

	// Focus the appropriate chip when focusedChipIndex changes
	useEffect(() => {
		if (focusedChipIndex >= 0 && chipRefs.current[focusedChipIndex]) {
			chipRefs.current[focusedChipIndex]?.focus();
		}
	}, [focusedChipIndex]);

	return (
		<div className={containerClasses} ref={containerRef}>
			{label && <div className="multi-select-label">{label}</div>}
			<div
				className={inputClasses}
				onClick={handleInputClick}
				onKeyDown={(e): void => {
					if (e.key === 'Enter' || e.key === ' ') {
						handleInputClick();
					}
				}}
				role="combobox"
				aria-expanded={isDropdownOpen}
				aria-haspopup="listbox"
				aria-controls="multi-select-dropdown"
				aria-owns="multi-select-dropdown"
				tabIndex={disabled ? -1 : 0}
			>
				<div className="multi-select-chips">
					{selectedOptions.map((option, index) => (
						<div
							key={option.value}
							className={`multi-select-chip ${
								focusedChipIndex === index ? 'multi-select-chip-focused' : ''
							}`}
							ref={(el): void => {
								chipRefs.current[index] = el;
							}}
							role="button"
							tabIndex={0}
							onKeyDown={(e): void => handleChipKeyDown(e, index)}
							onFocus={(): void => setFocusedChipIndex(index)}
							onClick={(e): void => e.stopPropagation()}
							aria-label={`Selected option: ${option.label}`}
						>
							{option.label}
							{!disabled && (
								<button
									type="button"
									className="multi-select-chip-remove"
									onClick={(e): void => {
										e.stopPropagation();
										handleRemoveItem(option.value);
									}}
									aria-label={`Remove ${option.label}`}
									tabIndex={-1} // Don't make the inner button tabbable
								>
									<CloseOutlined />
								</button>
							)}
						</div>
					))}
					<Input
						ref={inputRef}
						className="multi-select-search"
						placeholder={selectedOptions.length === 0 ? placeholder : ''}
						value={searchText}
						onChange={handleSearchChange}
						onKeyDown={handleKeyDown}
						onFocus={(): void => setIsDropdownOpen(true)}
						suffix={<SearchOutlined />}
						bordered={false}
						disabled={disabled}
					/>
					{allowClear && selectedValues.length > 0 && !disabled && (
						<button
							type="button"
							className="multi-select-clear-all"
							onClick={(e): void => {
								e.stopPropagation();
								handleClearAll();
							}}
							aria-label="Clear all selections"
						>
							<CloseOutlined />
						</button>
					)}
				</div>
			</div>

			{error && <div className="multi-select-error-text">{error}</div>}

			{isDropdownOpen && !disabled && (
				<div
					className="multi-select-dropdown"
					ref={dropdownRef}
					style={{
						maxHeight: `${dropdownMaxHeight}px`,
						maxWidth: dropdownMaxWidth ? `${dropdownMaxWidth}px` : undefined,
					}}
					id="multi-select-dropdown"
					role="listbox"
					aria-multiselectable="true"
				>
					{loading ? (
						<div className="multi-select-loading">
							<Spin size="small" />
							<span>We are updating the values ...</span>
						</div>
					) : (
						<>
							{showSelectAll && (
								<>
									<div className="multi-select-option">
										<Checkbox checked={allSelected} onChange={handleSelectAll}>
											ALL
										</Checkbox>
									</div>
									<div className="multi-select-divider" />
								</>
							)}
							<div
								className="multi-select-options-container"
								style={{ maxHeight: `${sectionMaxHeight}px` }}
							>
								{displayOptions.length > 0 ? (
									displayOptions.map((option) => (
										<div
											key={option.value}
											className="multi-select-option"
											role="option"
											aria-selected={selectedValues.includes(option.value)}
										>
											<Checkbox
												checked={selectedValues.includes(option.value)}
												onChange={(e): void => handleSelectionChange(option, e)}
												disabled={option.disabled}
											>
												{option.label}
											</Checkbox>
										</div>
									))
								) : (
									<div className="multi-select-no-results">
										{allowCustomValues && searchText
											? `Add "${searchText}"`
											: 'No results found'}
									</div>
								)}
							</div>

							{additionalSections.map(
								(section) =>
									section.options.length > 0 && (
										<div key={`section-${section.title}`}>
											<div className="multi-select-divider" />
											<div className="multi-select-section-label">{section.title}</div>
											<div
												className="multi-select-section-content"
												style={{ maxHeight: `${sectionMaxHeight}px` }}
											>
												{section.options.map((option) => (
													<div
														key={option.value}
														className="multi-select-option"
														role="option"
														aria-selected={selectedValues.includes(option.value)}
													>
														<Checkbox
															checked={selectedValues.includes(option.value)}
															onChange={(e): void => handleSelectionChange(option, e)}
															disabled={option.disabled}
														>
															{option.label}
														</Checkbox>
													</div>
												))}
											</div>
										</div>
									),
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

// Define defaultProps to fix linter warnings
MultiSelect.defaultProps = {
	value: [],
	placeholder: 'Search...',
	loading: false,
	allowCustomValues: true,
	onSearch: undefined,
	className: '',
	additionalSections: [],
	showSelectAll: true,
	dropdownMaxHeight: 400,
	dropdownMaxWidth: undefined,
	disabled: false,
	error: undefined,
	label: undefined,
	allowClear: true,
	sectionMaxHeight: 150,
};

export default MultiSelect;

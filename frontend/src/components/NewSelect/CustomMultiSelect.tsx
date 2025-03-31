/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/function-component-definition */
import './styles.scss';

import { SearchOutlined } from '@ant-design/icons';
import { Checkbox, Select, SelectProps, Spin } from 'antd';
import cx from 'classnames';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

export interface OptionData {
	label: string;
	value: string;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export interface GroupData {
	label: string;
	options: OptionData[];
	key?: string;
}

interface CustomTagProps {
	label: React.ReactNode;
	value: string;
	closable: boolean;
	onClose: () => void;
}

export interface CustomMultiSelectProps
	extends Omit<SelectProps<string[] | string>, 'options'> {
	placeholder?: string;
	className?: string;
	loading?: boolean;
	relatedValues?: GroupData;
	allValues?: GroupData[];
	onSearch?: (value: string) => void;
	options?: OptionData[];
	defaultActiveFirstOption?: boolean;
	dropdownMatchSelectWidth?: boolean | number;
	noDataMessage?: string;
	onClear?: () => void;
	allowSelectAll?: boolean;
	showAddCustomValue?: boolean;
	getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
	dropdownRender?: (menu: React.ReactElement) => React.ReactElement;
	highlightSearch?: boolean;
	customStatusText?: string;
}

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
	placeholder = 'Search...',
	className,
	loading = false,
	relatedValues,
	allValues,
	onSearch,
	options,
	value = [],
	onChange,
	defaultActiveFirstOption = true,
	dropdownMatchSelectWidth = true,
	noDataMessage = 'No Data',
	onClear,
	allowSelectAll = true,
	showAddCustomValue = true,
	getPopupContainer,
	dropdownRender,
	highlightSearch = true,
	customStatusText,
	...rest
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const selectRef = useRef<BaseSelectRef>(null);
	const [activeIndex, setActiveIndex] = useState<number>(-1);

	// Convert single string value to array for consistency
	const selectedValues = useMemo(
		(): string[] =>
			Array.isArray(value) ? value : value ? [value as string] : [],
		[value],
	);

	// Update the handleSearch function to handle tokenization
	const handleSearch = useCallback(
		(value: string): void => {
			// If the value ends with a comma, handle it as a custom value addition
			if (value.endsWith(',')) {
				const newValue = value.slice(0, -1).trim();
				if (newValue && !selectedValues.includes(newValue)) {
					const newValues = [...selectedValues, newValue];
					if (onChange) {
						onChange(newValues as any, newValues as any);
					}
				}
				// Clear the search text after adding
				setSearchText('');
			} else {
				setSearchText(value);
				if (onSearch) {
					onSearch(value);
				}
			}
		},
		[selectedValues, onChange, onSearch],
	);

	// Clear search when dropdown closes
	useEffect(() => {
		if (!isOpen) {
			setSearchText('');
		}
	}, [isOpen]);

	// Handle dropdown clicks and keyboard events
	const handleDropdownClick = useCallback((e: React.MouseEvent): void => {
		e.stopPropagation();
	}, []);

	const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent): void => {
		if (e.key === 'Escape') {
			setIsOpen(false);
		}
	}, []);

	// Highlight matching text in options - wrapped in useCallback to avoid deps change
	const highlightMatchedText = useCallback(
		(text: string, searchQuery: string): React.ReactNode => {
			if (!searchQuery || !highlightSearch) return text;

			const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
			return (
				<>
					{parts.map((part, i) => {
						// Create a unique key that doesn't rely on array index
						const uniqueKey = `${text.substring(0, 3)}-${part.substring(0, 3)}-${i}`;

						return part.toLowerCase() === searchQuery.toLowerCase() ? (
							<span key={uniqueKey} className="highlight-text">
								{part}
							</span>
						) : (
							part
						);
					})}
				</>
			);
		},
		[highlightSearch],
	);

	// Handle select all functionality
	const handleSelectAll = useCallback((): void => {
		if (!options) return;

		// If all options are already selected, deselect all
		const allOptionsSelected =
			options.length === selectedValues.length &&
			options.every((option) => selectedValues.includes(option.value));

		if (allOptionsSelected) {
			if (onChange) {
				onChange([] as any, [] as any);
			}
		} else {
			// Select all options
			const allValues = options.map((option) => option.value);
			if (onChange) {
				onChange(allValues as any, options as any);
			}
		}
	}, [options, selectedValues, onChange]);

	// Add custom value functionality
	const handleAddCustomValue = useCallback((): void => {
		if (!searchText || selectedValues.includes(searchText)) return;

		const newValues = [...selectedValues, searchText];
		if (onChange) {
			onChange(newValues as any, newValues as any);
		}
		setSearchText('');
	}, [searchText, selectedValues, onChange]);

	// Modify keyboard navigation to only handle left/right for chips
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>): void => {
			// Only handle left/right navigation between chips
			// Let Ant Design handle up/down navigation in the dropdown
			if (selectedValues.length > 0) {
				if (e.key === 'ArrowLeft') {
					// Don't prevent default - this allows Ant Design to also handle the event
					setActiveIndex((prev) =>
						prev <= 0 ? selectedValues.length - 1 : prev - 1,
					);
				} else if (e.key === 'ArrowRight') {
					// Don't prevent default - this allows Ant Design to also handle the event
					setActiveIndex((prev) =>
						prev >= selectedValues.length - 1 ? 0 : prev + 1,
					);
				} else if (e.key === 'Backspace' && activeIndex >= 0) {
					// Remove the active chip when Backspace is pressed
					const newValues = selectedValues.filter(
						(_, index) => index !== activeIndex,
					);
					if (onChange) {
						onChange(newValues as any, newValues as any);
					}
					setActiveIndex(-1);
				}
			}
		},
		[selectedValues, activeIndex, onChange],
	);

	// When dropdown opens/closes, handle chip focus state
	useEffect(() => {
		if (!isOpen) {
			setSearchText('');
			setActiveIndex(-1);
		}
	}, [isOpen]);

	// Handle option selection for related values and all values
	const handleOptionSelection = useCallback(
		(optionValue: string): void => {
			const newValues = selectedValues.includes(optionValue)
				? selectedValues.filter((v) => v !== optionValue)
				: [...selectedValues, optionValue];

			if (onChange) {
				onChange(newValues as any, newValues as any);
			}
		},
		[selectedValues, onChange],
	);

	// Custom dropdown render with related values and all values
	const customDropdownRender = useCallback(
		(menu: React.ReactElement): React.ReactElement => {
			const allOptions = options || [];
			const allOptionsSelected =
				allOptions.length > 0 &&
				allOptions.length === selectedValues.length &&
				allOptions.every((option) => selectedValues.includes(option.value));

			// Determine if we have any data
			const hasRelatedValues = relatedValues && relatedValues.options.length > 0;
			const hasAllValues =
				allValues &&
				allValues.length > 0 &&
				allValues.some((group) => group.options.length > 0);
			const hasOptions = options && options.length > 0;
			const hasSelectedValues =
				selectedValues.length > 0 &&
				options &&
				options.some((option) => selectedValues.includes(option.value));
			const hasNoData =
				!hasRelatedValues &&
				!hasAllValues &&
				!hasOptions &&
				!loading &&
				!searchText;

			const customMenu = (
				<div
					className="custom-multiselect-dropdown"
					onClick={handleDropdownClick}
					onKeyDown={handleDropdownKeyDown}
					role="listbox"
					aria-multiselectable="true"
					tabIndex={0}
				>
					{/* ALL checkbox only when search is empty */}
					{allowSelectAll && !searchText && allOptions.length > 0 && (
						<div className="select-all-option">
							<Checkbox checked={allOptionsSelected} onChange={handleSelectAll}>
								ALL
							</Checkbox>
						</div>
					)}

					{/* Add custom value option when search has content */}
					{showAddCustomValue && searchText && (
						<div
							className="custom-value-option"
							onMouseDown={(e: React.MouseEvent): void => {
								e.preventDefault();
								e.stopPropagation();
							}}
							role="button"
							tabIndex={0}
							onKeyDown={(e): void => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleAddCustomValue();
								}
							}}
						>
							<Checkbox
								checked={selectedValues.includes(searchText)}
								onChange={(e): void => {
									// Prevent propagation to keep dropdown open
									e.stopPropagation();
									handleAddCustomValue();
								}}
							>
								Add &quot;{searchText}&quot;
							</Checkbox>
						</div>
					)}

					{/* Default search results menu */}
					{searchText ? (
						<>
							{menu}
							{!loading && (!options || options.length === 0) && (
								<div className="empty-message">{noDataMessage}</div>
							)}
						</>
					) : (
						<>
							{/* Selected values section */}
							{hasSelectedValues && (
								<div className="selected-values-section">
									{options
										.filter((option) => selectedValues.includes(option.value))
										.map((option) => (
											<div
												key={option.value}
												className="selected-option"
												role="option"
												aria-selected="true"
											>
												<Checkbox
													checked
													onChange={(): void => {
														const newValues = selectedValues.filter(
															(v) => v !== option.value,
														);
														if (onChange) {
															onChange(newValues as any, newValues as any);
														}
													}}
												>
													{option.label}
												</Checkbox>
											</div>
										))}
								</div>
							)}

							{/* Related Values section */}
							{hasRelatedValues && (
								<div className="select-group">
									<div className="group-label" role="heading" aria-level={2}>
										Related Values
									</div>
									<div
										className="scrollable-group"
										role="group"
										aria-label="Related values options"
									>
										{relatedValues.options.map((option) => (
											<div
												key={option.value}
												className="option-item"
												role="option"
												aria-selected={selectedValues.includes(option.value)}
											>
												<Checkbox
													checked={selectedValues.includes(option.value)}
													onChange={(): void => {
														handleOptionSelection(option.value);
													}}
												>
													{option.label}
												</Checkbox>
											</div>
										))}
									</div>
								</div>
							)}

							{/* All Values section */}
							{hasAllValues && (
								<div className="select-group">
									<div className="group-label" role="heading" aria-level={2}>
										ALL Values
									</div>
									<div
										className="scrollable-group all-values"
										role="group"
										aria-label="All values options"
									>
										{allValues.map((group) =>
											group.options.map((option) => (
												<div
													key={option.value}
													className="option-item"
													role="option"
													aria-selected={selectedValues.includes(option.value)}
												>
													<Checkbox
														checked={selectedValues.includes(option.value)}
														onChange={(): void => {
															handleOptionSelection(option.value);
														}}
													>
														{option.label}
													</Checkbox>
												</div>
											)),
										)}
									</div>
								</div>
							)}

							{hasNoData && <div className="empty-message">{noDataMessage}</div>}
						</>
					)}

					{loading && (
						<div className="loading-container">
							<Spin size="small" />
						</div>
					)}

					{/* Status message */}
					{customStatusText && (
						<div className="status-message">{customStatusText}</div>
					)}

					{/* Navigation footer - only show if we have navigable content */}
					{(hasRelatedValues || hasAllValues || hasOptions) && (
						<div className="navigation-footer" role="note">
							<div className="navigation-icons">
								<ChevronUp size={16} />
								<ChevronDown size={16} />
							</div>
							<div className="navigation-text">to Navigate</div>
						</div>
					)}
				</div>
			);

			// Return the menu without trying to enhance with highlighted option classes
			return dropdownRender ? dropdownRender(customMenu) : customMenu;
		},
		[
			options,
			selectedValues,
			allowSelectAll,
			showAddCustomValue,
			searchText,
			loading,
			relatedValues,
			allValues,
			noDataMessage,
			customStatusText,
			handleDropdownClick,
			handleDropdownKeyDown,
			handleSelectAll,
			handleAddCustomValue,
			onChange,
			dropdownRender,
			handleOptionSelection,
		],
	);

	// Custom option renderer to include checkbox
	const customOptionRender = useCallback(
		(oriOption: any, info: { index: number }): React.ReactNode => (
			<div className={cx('custom-option')} data-index={info.index}>
				<Checkbox checked={selectedValues.includes(oriOption.value as string)}>
					{highlightMatchedText(String(oriOption.label || ''), searchText)}
				</Checkbox>
			</div>
		),
		[selectedValues, highlightMatchedText, searchText],
	);

	// Customize option labels to highlight search text
	const optionsWithHighlight = useMemo(() => {
		if (!options) return [];
		return options.map((option) => ({
			...option,
			label: highlightMatchedText(String(option.label || ''), searchText),
		}));
	}, [options, highlightMatchedText, searchText]);

	// Function to handle tag focus visually - we'll create a custom tagRender
	const tagRender = useCallback(
		(props: CustomTagProps): React.ReactElement => {
			const { label, value, closable, onClose } = props;
			const index = selectedValues.indexOf(value);
			const isActive = index === activeIndex;

			const handleTagKeyDown = (e: React.KeyboardEvent): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onClose();
				}
			};

			return (
				<div
					className={cx('ant-select-selection-item', {
						'ant-select-selection-item-active': isActive,
					})}
					style={
						isActive
							? { borderColor: '#40a9ff', backgroundColor: '#e6f7ff' }
							: undefined
					}
				>
					<span className="ant-select-selection-item-content">{label}</span>
					{closable && (
						<span
							className="ant-select-selection-item-remove"
							onClick={onClose}
							onKeyDown={handleTagKeyDown}
							role="button"
							tabIndex={0}
							aria-label="Remove tag"
						>
							×
						</span>
					)}
				</div>
			);
		},
		[selectedValues, activeIndex],
	);

	return (
		<Select
			ref={selectRef}
			className={cx('custom-multiselect', className)}
			placeholder={placeholder}
			mode="multiple"
			showSearch
			filterOption={false}
			onSearch={handleSearch}
			value={selectedValues}
			onChange={onChange}
			onDropdownVisibleChange={setIsOpen}
			open={isOpen}
			options={optionsWithHighlight}
			defaultActiveFirstOption={defaultActiveFirstOption}
			popupMatchSelectWidth={dropdownMatchSelectWidth}
			optionLabelProp="label"
			optionRender={customOptionRender}
			allowClear
			getPopupContainer={getPopupContainer ?? popupContainer}
			suffixIcon={<SearchOutlined />}
			dropdownRender={customDropdownRender}
			menuItemSelectedIcon={null}
			popupClassName="custom-multiselect-dropdown-container"
			notFoundContent={null}
			tokenSeparators={[',']}
			onKeyDown={handleKeyDown}
			tagRender={tagRender as any}
			placement="bottomLeft"
			virtual={false} // Disable virtual scrolling to ensure focus works correctly
			{...rest}
		/>
	);
};

CustomMultiSelect.defaultProps = {
	placeholder: 'Search...',
	className: '',
	loading: false,
	relatedValues: undefined,
	allValues: undefined,
	onSearch: undefined,
	options: undefined,
	defaultActiveFirstOption: true,
	dropdownMatchSelectWidth: true,
	noDataMessage: 'No Data',
	onClear: undefined,
	allowSelectAll: true,
	showAddCustomValue: true,
	getPopupContainer: undefined,
	dropdownRender: undefined,
	highlightSearch: true,
	customStatusText: undefined,
};

export default CustomMultiSelect;

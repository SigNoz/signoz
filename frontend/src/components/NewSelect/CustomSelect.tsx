/* eslint-disable no-nested-ternary */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/function-component-definition */
import './styles.scss';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Select, SelectProps } from 'antd';
import cx from 'classnames';
import { capitalize, isEmpty } from 'lodash-es';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

import { prioritizeOrAddOption } from './utils';

export interface OptionData {
	label: string;
	value?: string;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
	options?: OptionData[];
	type?: 'defined' | 'custom';
}

export interface CustomSelectProps extends Omit<SelectProps, 'options'> {
	placeholder?: string;
	className?: string;
	loading?: boolean;
	onSearch?: (value: string) => void;
	options?: OptionData[];
	defaultActiveFirstOption?: boolean;
	noDataMessage?: string;
	onClear?: () => void;
	getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
	dropdownRender?: (menu: React.ReactElement) => React.ReactElement;
	highlightSearch?: boolean;
	placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
	popupMatchSelectWidth?: boolean;
	errorMessage?: string;
}

/**
 * CustomSelect Component
 *
 */
const CustomSelect: React.FC<CustomSelectProps> = ({
	placeholder = 'Search...',
	className,
	loading = false,
	onSearch,
	options = [],
	value,
	onChange,
	defaultActiveFirstOption = true,
	noDataMessage,
	onClear,
	getPopupContainer,
	dropdownRender,
	highlightSearch = true,
	placement = 'bottomLeft',
	popupMatchSelectWidth = true,
	popupClassName,
	errorMessage,
	...rest
}) => {
	// ===== State & Refs =====
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const [activeOptionIndex, setActiveOptionIndex] = useState<number>(-1);

	// Refs for element access and scroll behavior
	const selectRef = useRef<any>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const optionRefs = useRef<Record<number, HTMLDivElement | null>>({});

	// ===== Option Filtering & Processing Utilities =====

	/**
	 * Checks if a label exists in the provided options
	 */
	const isLabelPresent = useCallback(
		(options: OptionData[], label: string): boolean =>
			options.some((option) => {
				const lowerLabel = label.toLowerCase();

				// Check in nested options if they exist
				if ('options' in option && Array.isArray(option.options)) {
					return option.options.some(
						(subOption) => subOption.label.toLowerCase() === lowerLabel,
					);
				}

				// Check top-level option
				return option.label.toLowerCase() === lowerLabel;
			}),
		[],
	);

	/**
	 * Filters options based on search text
	 */
	const filterOptionsBySearch = useCallback(
		(options: OptionData[], searchText: string): OptionData[] => {
			if (!searchText.trim()) return options;

			const lowerSearchText = searchText.toLowerCase();

			return options
				.map((option) => {
					if ('options' in option && Array.isArray(option.options)) {
						// Filter nested options
						const filteredSubOptions = option.options.filter((subOption) =>
							subOption.label.toLowerCase().includes(lowerSearchText),
						);

						return filteredSubOptions.length > 0
							? { ...option, options: filteredSubOptions }
							: undefined;
					}

					// Filter top-level options
					return option.label.toLowerCase().includes(lowerSearchText)
						? option
						: undefined;
				})
				.filter(Boolean) as OptionData[];
		},
		[],
	);

	/**
	 * Separates section and non-section options
	 */
	const splitOptions = useCallback((options: OptionData[]): {
		sectionOptions: OptionData[];
		nonSectionOptions: OptionData[];
	} => {
		const sectionOptions: OptionData[] = [];
		const nonSectionOptions: OptionData[] = [];

		options.forEach((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				sectionOptions.push(option);
			} else {
				nonSectionOptions.push(option);
			}
		});

		return { sectionOptions, nonSectionOptions };
	}, []);

	/**
	 * Apply search filtering to options
	 */
	const filteredOptions = useMemo(
		(): OptionData[] => filterOptionsBySearch(options, searchText),
		[options, searchText, filterOptionsBySearch],
	);

	// ===== UI & Rendering Functions =====

	/**
	 * Highlights matched text in search results
	 */
	const highlightMatchedText = useCallback(
		(text: string, searchQuery: string): React.ReactNode => {
			if (!searchQuery || !highlightSearch) return text;

			const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
			return (
				<>
					{parts.map((part, i) => {
						// Create a deterministic but unique key
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

	/**
	 * Renders an individual option with proper keyboard navigation support
	 */
	const renderOptionItem = useCallback(
		(
			option: OptionData,
			isSelected: boolean,
			index?: number,
		): React.ReactElement => {
			const handleSelection = (): void => {
				if (onChange) {
					onChange(option.value, option);
					setIsOpen(false);
				}
			};

			const isActive = index === activeOptionIndex;
			const optionId = `option-${index}`;

			return (
				<div
					key={option.value}
					id={optionId}
					ref={(el): void => {
						if (index !== undefined) {
							optionRefs.current[index] = el;
						}
					}}
					className={cx('option-item', {
						selected: isSelected,
						active: isActive,
					})}
					onClick={(e): void => {
						e.stopPropagation();
						handleSelection();
					}}
					onKeyDown={(e): void => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleSelection();
						}
					}}
					onMouseEnter={(): void => setActiveOptionIndex(index || -1)}
					role="option"
					aria-selected={isSelected}
					aria-disabled={option.disabled}
					tabIndex={isActive ? 0 : -1}
				>
					<div className="option-content">
						<div>{highlightMatchedText(String(option.label || ''), searchText)}</div>
						{option.type === 'custom' && (
							<div className="option-badge">{capitalize(option.type)}</div>
						)}
					</div>
				</div>
			);
		},
		[highlightMatchedText, searchText, onChange, activeOptionIndex],
	);

	/**
	 * Helper function to render option with index tracking
	 */
	const renderOptionWithIndex = useCallback(
		(option: OptionData, isSelected: boolean, idx: number) =>
			renderOptionItem(option, isSelected, idx),
		[renderOptionItem],
	);

	/**
	 * Custom clear button renderer
	 */
	const clearIcon = useCallback(
		() => (
			<CloseOutlined
				onClick={(e): void => {
					e.stopPropagation();
					if (onChange) onChange(undefined, []);
					if (onClear) onClear();
				}}
			/>
		),
		[onChange, onClear],
	);

	// ===== Event Handlers =====

	/**
	 * Handles search input changes
	 */
	const handleSearch = useCallback(
		(value: string): void => {
			const trimmedValue = value.trim();
			setSearchText(trimmedValue);

			// Ensure dropdown opens when typing
			if (!isOpen) {
				setIsOpen(true);
			}

			if (onSearch) onSearch(trimmedValue);
		},
		[onSearch, isOpen],
	);

	/**
	 * Prevents event propagation for dropdown clicks
	 */
	const handleDropdownClick = useCallback((e: React.MouseEvent): void => {
		e.stopPropagation();
	}, []);

	/**
	 * Comprehensive keyboard navigation handler
	 */
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent): void => {
			// Handle keyboard navigation when dropdown is open
			if (isOpen) {
				// Get flattened list of all selectable options
				const getFlatOptions = (): OptionData[] => {
					if (!filteredOptions) return [];

					const flatList: OptionData[] = [];

					// Process options
					const { sectionOptions, nonSectionOptions } = splitOptions(
						isEmpty(value)
							? filteredOptions
							: prioritizeOrAddOption(filteredOptions, value),
					);

					// Add custom option if needed
					if (!isEmpty(searchText) && !isLabelPresent(filteredOptions, searchText)) {
						flatList.push({
							label: searchText,
							value: searchText,
							type: 'custom',
						});
					}

					// Add all options to flat list
					flatList.push(...nonSectionOptions);
					sectionOptions.forEach((section) => {
						if (section.options) {
							flatList.push(...section.options);
						}
					});

					return flatList;
				};

				const options = getFlatOptions();

				switch (e.key) {
					case 'ArrowDown':
						e.preventDefault();
						setActiveOptionIndex((prev) =>
							prev < options.length - 1 ? prev + 1 : 0,
						);
						break;

					case 'ArrowUp':
						e.preventDefault();
						setActiveOptionIndex((prev) =>
							prev > 0 ? prev - 1 : options.length - 1,
						);
						break;

					case 'Tab':
						// Tab navigation with Shift key support
						if (e.shiftKey) {
							e.preventDefault();
							setActiveOptionIndex((prev) =>
								prev > 0 ? prev - 1 : options.length - 1,
							);
						} else {
							e.preventDefault();
							setActiveOptionIndex((prev) =>
								prev < options.length - 1 ? prev + 1 : 0,
							);
						}
						break;

					case 'Enter':
						e.preventDefault();
						if (activeOptionIndex >= 0 && activeOptionIndex < options.length) {
							// Select the focused option
							const selectedOption = options[activeOptionIndex];
							if (onChange) {
								onChange(selectedOption.value, selectedOption);
								setIsOpen(false);
								setActiveOptionIndex(-1);
							}
						} else if (!isEmpty(searchText)) {
							// Add custom value when no option is focused
							const customOption = {
								label: searchText,
								value: searchText,
								type: 'custom',
							};
							if (onChange) {
								onChange(customOption.value, customOption);
								setIsOpen(false);
								setActiveOptionIndex(-1);
							}
						}
						break;

					case 'Escape':
						e.preventDefault();
						setIsOpen(false);
						setActiveOptionIndex(-1);
						break;

					case ' ': // Space key
						if (activeOptionIndex >= 0 && activeOptionIndex < options.length) {
							e.preventDefault();
							const selectedOption = options[activeOptionIndex];
							if (onChange) {
								onChange(selectedOption.value, selectedOption);
								setIsOpen(false);
								setActiveOptionIndex(-1);
							}
						}
						break;
					default:
						break;
				}
			} else if (e.key === 'ArrowDown' || e.key === 'Tab') {
				// Open dropdown when Down or Tab is pressed while closed
				e.preventDefault();
				setIsOpen(true);
				setActiveOptionIndex(0);
			}
		},
		[
			isOpen,
			activeOptionIndex,
			filteredOptions,
			searchText,
			onChange,
			splitOptions,
			value,
			isLabelPresent,
		],
	);

	// ===== Dropdown Rendering =====

	/**
	 * Renders the custom dropdown with sections and keyboard navigation
	 */
	const customDropdownRender = useCallback((): React.ReactElement => {
		// Process options based on current value
		const processedOptions = isEmpty(value)
			? filteredOptions
			: prioritizeOrAddOption(filteredOptions, value);

		const { sectionOptions, nonSectionOptions } = splitOptions(processedOptions);

		// Check if we need to add a custom option based on search text
		const isSearchTextNotPresent =
			!isEmpty(searchText) && !isLabelPresent(processedOptions, searchText);

		let optionIndex = 0;

		// Add custom option if needed
		if (isSearchTextNotPresent) {
			nonSectionOptions.unshift({
				label: searchText,
				value: searchText,
				type: 'custom',
			});
		}

		// Helper function to map options with index tracking
		const mapOptions = (options: OptionData[]): React.ReactNode =>
			options.map((option) => {
				const result = renderOptionWithIndex(
					option,
					option.value === value,
					optionIndex,
				);
				optionIndex += 1;
				return result;
			});

		let footerMessage = 'to Navigate';

		if (loading) {
			footerMessage = 'We are updating the values...';
		} else if (errorMessage) {
			footerMessage = errorMessage;
		} else if (noDataMessage) {
			footerMessage = noDataMessage;
		}

		const customMenu = (
			<div
				ref={dropdownRef}
				className="custom-select-dropdown"
				onClick={handleDropdownClick}
				onKeyDown={handleKeyDown}
				role="listbox"
				tabIndex={-1}
				aria-activedescendant={
					activeOptionIndex >= 0 ? `option-${activeOptionIndex}` : undefined
				}
			>
				{/* Non-section options */}
				<div className="no-section-options">
					{nonSectionOptions.length > 0 && mapOptions(nonSectionOptions)}
				</div>

				{/* Section options */}
				{sectionOptions.length > 0 &&
					sectionOptions.map((section) =>
						!isEmpty(section.options) ? (
							<div className="select-group" key={section.label}>
								<div className="group-label" role="heading" aria-level={2}>
									{section.label}
								</div>
								<div
									className="scrollable-group"
									role="group"
									aria-label={`${section.label} options`}
								>
									{section.options && mapOptions(section.options)}
								</div>
							</div>
						) : null,
					)}

				{/* Loading state
				{!hasOptions && loading && (
					<div className="loading-container">
						<Spin size="small" />
					</div>
				)} */}

				{/* Navigation help footer */}
				<div className="navigation-footer" role="note">
					{!loading && !errorMessage && !noDataMessage && (
						<div className="navigation-icons">
							<ChevronUp size={16} />
							<ChevronDown size={16} />
						</div>
					)}
					<div className="navigation-text">{footerMessage}</div>
				</div>
			</div>
		);

		return dropdownRender ? dropdownRender(customMenu) : customMenu;
	}, [
		filteredOptions,
		value,
		splitOptions,
		searchText,
		isLabelPresent,
		loading,
		errorMessage,
		noDataMessage,
		handleDropdownClick,
		handleKeyDown,
		activeOptionIndex,
		dropdownRender,
		renderOptionWithIndex,
	]);

	// ===== Side Effects =====

	// Clear search text when dropdown closes
	useEffect(() => {
		if (!isOpen) {
			setSearchText('');
			setActiveOptionIndex(-1);
		}
	}, [isOpen]);

	// Auto-scroll to active option for keyboard navigation
	useEffect(() => {
		if (
			isOpen &&
			activeOptionIndex >= 0 &&
			optionRefs.current[activeOptionIndex]
		) {
			optionRefs.current[activeOptionIndex]?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	}, [isOpen, activeOptionIndex]);

	// ===== Final Processing =====

	// Apply highlight to matched text in options
	const optionsWithHighlight = useMemo(
		() =>
			options
				?.filter((option) =>
					String(option.label || '')
						.toLowerCase()
						.includes(searchText.toLowerCase()),
				)
				?.map((option) => ({
					...option,
					label: highlightMatchedText(String(option.label || ''), searchText),
				})),
		[options, searchText, highlightMatchedText],
	);

	// ===== Component Rendering =====
	return (
		<Select
			ref={selectRef}
			className={cx('custom-select', className)}
			placeholder={placeholder}
			showSearch
			filterOption={false}
			onSearch={handleSearch}
			value={value}
			onChange={onChange}
			onDropdownVisibleChange={setIsOpen}
			open={isOpen}
			options={optionsWithHighlight}
			defaultActiveFirstOption={defaultActiveFirstOption}
			popupMatchSelectWidth={popupMatchSelectWidth}
			allowClear={{ clearIcon }}
			getPopupContainer={getPopupContainer ?? popupContainer}
			suffixIcon={<SearchOutlined />}
			dropdownRender={customDropdownRender}
			menuItemSelectedIcon={null}
			popupClassName={cx('custom-select-dropdown-container', popupClassName)}
			listHeight={300}
			placement={placement}
			optionFilterProp="label"
			notFoundContent={<div className="empty-message">{noDataMessage}</div>}
			onKeyDown={handleKeyDown}
			{...rest}
		/>
	);
};

// ===== Default Props =====
CustomSelect.defaultProps = {
	placeholder: 'Search...',
	className: '',
	loading: false,
	onSearch: undefined,
	options: undefined,
	defaultActiveFirstOption: true,
	noDataMessage: '',
	onClear: undefined,
	getPopupContainer: undefined,
	dropdownRender: undefined,
	highlightSearch: true,
	placement: 'bottomLeft',
	popupMatchSelectWidth: true,
	errorMessage: '',
};

export default CustomSelect;

/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/function-component-definition */
import './styles.scss';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { Select, SelectProps, Spin } from 'antd';
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
}

const CustomSelect: React.FC<CustomSelectProps> = ({
	placeholder = 'Search...',
	className,
	loading = false,
	onSearch,
	options,
	value,
	onChange,
	defaultActiveFirstOption = true,
	noDataMessage = 'No Data',
	onClear,
	getPopupContainer,
	dropdownRender,
	highlightSearch = true,
	placement = 'bottomLeft',
	popupMatchSelectWidth = true,
	popupClassName,
	...rest
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const selectRef = useRef<any>(null);

	// Handle search input
	const handleSearch = useCallback(
		(value: string): void => {
			setSearchText(value.trim());
			// Ensure dropdown stays open when typing
			if (!isOpen) {
				setIsOpen(true);
			}
			if (onSearch) onSearch(value.trim());
		},
		[onSearch, isOpen],
	);

	console.log(rest.title, value);
	// Clear search when dropdown closes
	useEffect(() => {
		if (!isOpen) {
			setSearchText('');
		}
	}, [isOpen]);

	// Handle dropdown clicks to prevent closing when selecting
	const handleDropdownClick = useCallback((e: React.MouseEvent): void => {
		e.stopPropagation();
	}, []);

	// Handle keyboard events for better accessibility
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, callback?: () => void): void => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (callback) callback();
			}
		},
		[],
	);

	// Highlight matching text in options
	const highlightMatchedText = useCallback(
		(text: string, searchQuery: string): React.ReactNode => {
			if (!searchQuery || !highlightSearch) return text;

			const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
			return (
				<>
					{parts.map((part, i) => {
						// Create a deterministic but more unique key
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

	// Generate option display element
	const renderOptionItem = useCallback(
		(option: OptionData, isSelected: boolean): React.ReactElement => {
			// Create a handler function to reuse in both click and keyboard events
			const handleSelection = (): void => {
				if (onChange) {
					onChange(option.value, option);
					setIsOpen(false);
				}
			};

			return (
				<div
					key={option.value}
					className={cx('option-item', { selected: isSelected })}
					onClick={(e): void => {
						e.stopPropagation();
						handleSelection();
					}}
					onKeyDown={(e): void => handleKeyDown(e, handleSelection)}
					role="option"
					aria-selected={isSelected}
					tabIndex={0}
				>
					{/* {highlightMatchedText(String(option.label || ''), searchText)} */}
					<div className="option-content">
						<div>{highlightMatchedText(String(option.label || ''), searchText)}</div>
						{option.type === 'custom' && (
							<div className="option-badge">{capitalize(option.type)}</div>
						)}
					</div>
				</div>
			);
		},
		[highlightMatchedText, searchText, onChange, handleKeyDown],
	);

	// Is Preset or not
	const isLabelPresent = (options: OptionData[], label: string): boolean =>
		options.some((option) => {
			if ('options' in option && Array.isArray(option.options)) {
				// Check inside nested options
				return option.options.some(
					(subOption) => subOption.label.toLowerCase() === label.toLowerCase(),
				);
			}
			// Check top-level options
			return option.label.toLowerCase() === label.toLowerCase();
		});

	const filterOptionsBySearch = (
		options: OptionData[],
		searchText: string,
	): OptionData[] => {
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
	};

	// Move splitOptions into useCallback
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

	const filteredOptions = useMemo(
		(): OptionData[] => filterOptionsBySearch(options ?? [], searchText),
		[options, searchText],
	);

	// Custom dropdown render with related values and all values
	const customDropdownRender = useCallback((): React.ReactElement => {
		const hasOptions = filteredOptions && filteredOptions.length > 0;

		// processed options
		const processedOptions = isEmpty(value)
			? filteredOptions
			: prioritizeOrAddOption(filteredOptions, value);

		const { sectionOptions, nonSectionOptions } = splitOptions(processedOptions);

		const isSearchTextNotPresent =
			!isEmpty(searchText) && !isLabelPresent(processedOptions, searchText);

		if (isSearchTextNotPresent) {
			nonSectionOptions.unshift({
				label: searchText,
				value: searchText,
				type: 'custom',
			});
		}

		const customMenu = (
			<div
				className="custom-select-dropdown"
				onClick={handleDropdownClick}
				onKeyDown={(e): void => handleKeyDown(e)}
				role="listbox"
				tabIndex={-1}
			>
				<div className="no-section-options">
					{/* Show non-section options */}
					{nonSectionOptions.length > 0 &&
						nonSectionOptions.map((option) =>
							renderOptionItem(option, option.value === value),
						)}
				</div>

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
									{section.options?.map((option) =>
										renderOptionItem(option, option.value === value),
									)}
								</div>
							</div>
						) : null,
					)}

				{/* Rest of the existing content */}
				{/* {hasNoData && <div className="empty-message">{noDataMessage}</div>} */}

				{!hasOptions && loading && (
					<div className="loading-container">
						<Spin size="small" />
					</div>
				)}
				{/* Navigation footer */}
				<div className="navigation-footer" role="note">
					<div className="navigation-icons">
						<ChevronUp size={16} />
						<ChevronDown size={16} />
					</div>
					<div className="navigation-text">to Navigate</div>
				</div>
			</div>
		);

		return dropdownRender ? dropdownRender(customMenu) : customMenu;
	}, [
		filteredOptions,
		splitOptions,
		searchText,
		handleDropdownClick,
		loading,
		dropdownRender,
		handleKeyDown,
		renderOptionItem,
		value,
	]);

	// Custom clear button
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

	const optionsWithHighlight = useMemo(
		() =>
			options
				// eslint-disable-next-line sonarjs/no-identical-functions
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
			{...rest}
		/>
	);
};

CustomSelect.defaultProps = {
	placeholder: 'Search...',
	className: '',
	loading: false,
	onSearch: undefined,
	options: undefined,
	defaultActiveFirstOption: true,
	noDataMessage: 'No Data',
	onClear: undefined,
	getPopupContainer: undefined,
	dropdownRender: undefined,
	highlightSearch: true,
	placement: 'bottomLeft',
	popupMatchSelectWidth: true,
};

export default CustomSelect;

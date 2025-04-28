/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/function-component-definition */
import './styles.scss';

import {
	DownOutlined,
	LoadingOutlined,
	ReloadOutlined,
} from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Checkbox, Select, Typography } from 'antd';
import cx from 'classnames';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { capitalize, isEmpty } from 'lodash-es';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

import { CustomMultiSelectProps, CustomTagProps, OptionData } from './types';
import {
	filterOptionsBySearch,
	prioritizeOrAddOptionForMultiSelect,
	SPACEKEY,
} from './utils';

enum ToggleTagValue {
	Only = 'Only',
	All = 'All',
}

const ALL_SELECTED_VALUE = '__all__'; // Constant for the special value

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
	placeholder = 'Search...',
	className,
	loading = false,
	onSearch,
	options = [],
	value = [],
	onChange,
	defaultActiveFirstOption = true,
	dropdownMatchSelectWidth = true,
	noDataMessage,
	errorMessage,
	onClear,
	enableAllSelection = true,
	getPopupContainer,
	dropdownRender,
	highlightSearch = true,
	popupClassName,
	placement = 'bottomLeft',
	maxTagCount,
	allowClear = false,
	onRetry,
	maxTagTextLength,
	...rest
}) => {
	// ===== State & Refs =====
	const [isOpen, setIsOpen] = useState(false);
	const [searchText, setSearchText] = useState('');
	const selectRef = useRef<BaseSelectRef>(null);
	const [activeIndex, setActiveIndex] = useState<number>(-1);
	const [activeChipIndex, setActiveChipIndex] = useState<number>(-1); // For tracking active chip/tag
	const [selectionStart, setSelectionStart] = useState<number>(-1);
	const [selectionEnd, setSelectionEnd] = useState<number>(-1);
	const [selectedChips, setSelectedChips] = useState<number[]>([]);
	const [isSelectionMode, setIsSelectionMode] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const optionRefs = useRef<Record<number, HTMLDivElement | null>>({});
	const [visibleOptions, setVisibleOptions] = useState<OptionData[]>([]);
	const isClickInsideDropdownRef = useRef(false);

	// Convert single string value to array for consistency
	const selectedValues = useMemo(
		(): string[] =>
			Array.isArray(value) ? value : value ? [value as string] : [],
		[value],
	);

	// Helper function to get all *available* values from options (excluding disabled)
	const getAllAvailableValues = useCallback(
		(optionsList: OptionData[]): string[] => {
			const values: string[] = [];

			optionsList.forEach((option) => {
				if ('options' in option && Array.isArray(option.options)) {
					option.options?.forEach((subOption) => {
						if (subOption.value) {
							values.push(subOption.value);
						}
					});
				} else if (option.value) {
					values.push(option.value);
				}
			});

			return values;
		},
		[],
	);

	const allAvailableValues = useMemo(() => {
		const combinedOptions = prioritizeOrAddOptionForMultiSelect(
			options,
			selectedValues,
		);
		return getAllAvailableValues(combinedOptions);
	}, [options, selectedValues, getAllAvailableValues]);

	const isAllSelected = useMemo(() => {
		if (!enableAllSelection || allAvailableValues.length === 0) {
			return false;
		}
		// Check if every available value is included in the selected values
		return allAvailableValues.every((val) => selectedValues.includes(val));
	}, [selectedValues, allAvailableValues, enableAllSelection]);

	// Value passed to the underlying Ant Select component
	const displayValue = useMemo(
		() => (isAllSelected ? [ALL_SELECTED_VALUE] : selectedValues),
		[isAllSelected, selectedValues],
	);

	// ===== Internal onChange Handler =====
	const handleInternalChange = useCallback(
		(newValue: string | string[]): void => {
			// Ensure newValue is an array
			const currentNewValue = Array.isArray(newValue) ? newValue : [];

			if (!onChange) return;

			// Case 1: Cleared (empty array or undefined)
			if (!newValue || currentNewValue.length === 0) {
				onChange([], []);
				return;
			}

			// Case 2: "__all__" is selected (means select all actual values)
			if (currentNewValue.includes(ALL_SELECTED_VALUE)) {
				const allActualOptions = allAvailableValues.map(
					(v) => options.flat().find((o) => o.value === v) || { label: v, value: v },
				);
				onChange(allAvailableValues as any, allActualOptions as any);
			} else {
				// Case 3: Regular values selected
				// Check if the selection now constitutes "all selected"
				const nowAllSelected =
					enableAllSelection &&
					allAvailableValues.length > 0 &&
					allAvailableValues.every((val) => currentNewValue.includes(val));

				if (nowAllSelected) {
					const allActualOptions = allAvailableValues.map(
						(v) =>
							options.flat().find((o) => o.value === v) || { label: v, value: v },
					);
					onChange(allAvailableValues as any, allActualOptions as any);
				} else {
					// Pass through the regular selection
					// Map selected values back to OptionData format if possible
					const correspondingOptions = currentNewValue.map(
						(v) =>
							options.flat().find((o) => o.value === v) || { label: v, value: v },
					);
					onChange(currentNewValue as any, correspondingOptions as any);
				}
			}
		},
		[onChange, allAvailableValues, options, enableAllSelection],
	);

	// ===== Existing Callbacks (potentially needing adjustment later) =====

	const currentToggleTagValue = useCallback(
		({ option }: { option: string }): ToggleTagValue => {
			if (
				Array.isArray(selectedValues) &&
				selectedValues?.includes(option.toString()) &&
				selectedValues.length === 1
			) {
				return ToggleTagValue.All;
			}
			return ToggleTagValue.Only;
		},
		[selectedValues],
	);

	const ensureValidOption = useCallback(
		(option: string): boolean =>
			!(
				currentToggleTagValue({ option }) === ToggleTagValue.All &&
				!enableAllSelection
			),
		[currentToggleTagValue, enableAllSelection],
	);

	/**
	 * Checks if a label exists in the provided options
	 */
	const isLabelPresent = useCallback(
		(options: OptionData[], label: string): boolean =>
			options.some((option) => {
				const lowerLabel = label.toLowerCase();

				// Check in nested options if they exist
				if ('options' in option && Array.isArray(option.options)) {
					return (
						option.options?.some(
							(subOption) => subOption.label.toLowerCase() === lowerLabel,
						) || false
					);
				}

				// Check top-level option
				return option.label.toLowerCase() === lowerLabel;
			}),
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
		[options, searchText],
	);

	useEffect(() => {
		if (!isEmpty(searchText)) {
			setVisibleOptions([
				{
					label: searchText,
					value: searchText,
					type: 'custom',
				},
				...filteredOptions,
			]);
		} else {
			setVisibleOptions(
				selectedValues.length > 0 && isEmpty(searchText)
					? prioritizeOrAddOptionForMultiSelect(filteredOptions, selectedValues)
					: filteredOptions,
			);
		}
	}, [filteredOptions, searchText, options, selectedValues]);

	// ===== Text Selection Utilities =====

	/**
	 * Clears all chip selections
	 */
	const clearSelection = useCallback((): void => {
		setSelectionStart(-1);
		setSelectionEnd(-1);
		setSelectedChips([]);
		setIsSelectionMode(false);
	}, []);

	/**
	 * Selects all chips
	 */
	const selectAllChips = useCallback((): void => {
		if (selectedValues.length === 0) return;

		// When maxTagCount is set, only select visible chips
		const visibleCount =
			maxTagCount !== undefined && maxTagCount > 0
				? Math.min(maxTagCount, selectedValues.length)
				: selectedValues.length;

		const allIndices = Array.from({ length: visibleCount }, (_, i) => i);

		setSelectionStart(0);
		setSelectionEnd(visibleCount - 1);
		setSelectedChips(allIndices);
		setIsSelectionMode(true);
	}, [selectedValues, maxTagCount]);

	/**
	 * Gets indices between start and end (inclusive)
	 */
	const getIndicesBetween = useCallback(
		(start: number, end: number): number[] => {
			const indices: number[] = [];
			const min = Math.min(start, end);
			const max = Math.max(start, end);

			for (let i = min; i <= max; i++) {
				indices.push(i);
			}

			return indices;
		},
		[],
	);

	/**
	 * Start selection from an index
	 */
	const startSelection = useCallback((index: number): void => {
		setSelectionStart(index);
		setSelectionEnd(index);
		setSelectedChips([index]);
		setIsSelectionMode(true);
		setActiveChipIndex(index);
	}, []);

	/**
	 * Extend selection to an index
	 */
	const extendSelection = useCallback(
		(index: number): void => {
			if (selectionStart === -1) {
				startSelection(index);
				return;
			}

			setSelectionEnd(index);
			const newSelectedChips = getIndicesBetween(selectionStart, index);
			setSelectedChips(newSelectedChips);
			setActiveChipIndex(index);
		},
		[selectionStart, getIndicesBetween, startSelection],
	);

	/**
	 * Handle copy event
	 */
	const handleCopy = useCallback((): void => {
		if (selectedChips.length === 0) return;

		const selectedTexts = selectedChips
			.sort((a, b) => a - b)
			.map((index) => selectedValues[index]);

		const textToCopy = selectedTexts.join(', ');

		navigator.clipboard.writeText(textToCopy).catch(console.error);
	}, [selectedChips, selectedValues]);

	/**
	 * Handle cut event
	 */
	const handleCut = useCallback((): void => {
		if (selectedChips.length === 0) return;

		// First copy the content
		handleCopy();

		// Then remove the selected chips
		const newValues = selectedValues.filter(
			(_, index) => !selectedChips.includes(index),
		);

		if (onChange) {
			onChange(
				newValues as any,
				newValues.map((v) => ({ label: v, value: v })),
			);
		}

		// Clear selection after cut
		clearSelection();
	}, [selectedChips, selectedValues, handleCopy, clearSelection, onChange]);

	// ===== Event Handlers =====

	/**
	 * Handles search input changes
	 */
	const handleSearch = useCallback(
		(value: string): void => {
			setActiveIndex(-1);

			// Check if we have an unbalanced quote that needs to be preserved
			const hasOpenQuote =
				(value.match(/"/g) || []).length % 2 !== 0 ||
				(value.match(/'/g) || []).length % 2 !== 0;

			// Only process by comma if we don't have open quotes
			if (value.includes(',') && !hasOpenQuote) {
				const values: string[] = [];
				let currentValue = '';
				let inSingleQuotes = false;
				let inDoubleQuotes = false;

				for (let i = 0; i < value.length; i++) {
					const char = value[i];

					// Handle quote characters
					if (char === '"' && !inSingleQuotes) {
						inDoubleQuotes = !inDoubleQuotes;
						currentValue += char;
					} else if (char === "'" && !inDoubleQuotes) {
						inSingleQuotes = !inSingleQuotes;
						currentValue += char;
					}
					// Handle commas outside of quotes
					else if (char === ',' && !inSingleQuotes && !inDoubleQuotes) {
						// Comma outside quotes - end of value
						if (currentValue.trim()) {
							// Process the value to remove surrounding quotes if present
							let processedValue = currentValue.trim();
							if (
								(processedValue.startsWith('"') && processedValue.endsWith('"')) ||
								(processedValue.startsWith("'") && processedValue.endsWith("'"))
							) {
								// Remove surrounding quotes
								processedValue = processedValue.substring(1, processedValue.length - 1);
							}

							if (!selectedValues.includes(processedValue)) {
								values.push(processedValue);
							}
						}
						currentValue = '';
					}
					// All other characters
					else {
						currentValue += char;
					}
				}

				// Process the last value if there is one
				if (currentValue.trim()) {
					let processedValue = currentValue.trim();
					if (
						(processedValue.startsWith('"') && processedValue.endsWith('"')) ||
						(processedValue.startsWith("'") && processedValue.endsWith("'"))
					) {
						// Remove surrounding quotes
						processedValue = processedValue.substring(1, processedValue.length - 1);
					}

					if (!selectedValues.includes(processedValue)) {
						values.push(processedValue);
					}
				}

				if (values.length > 0) {
					const newValues = [...selectedValues, ...values];
					if (onChange) {
						onChange(
							newValues as any,
							newValues.map((v) => ({ label: v, value: v })),
						);
					}
				}
				setSearchText('');
				return;
			}
			if (value.endsWith(',') && !hasOpenQuote) {
				// Process a single value when comma is typed at the end (outside quotes)
				const valueToProcess = value.slice(0, -1).trim();

				if (valueToProcess) {
					// Process the value to remove surrounding quotes if present
					let processedValue = valueToProcess;
					if (
						(processedValue.startsWith('"') && processedValue.endsWith('"')) ||
						(processedValue.startsWith("'") && processedValue.endsWith("'"))
					) {
						// Remove surrounding quotes
						processedValue = processedValue.substring(1, processedValue.length - 1);
					}

					if (!selectedValues.includes(processedValue)) {
						const newValues = [...selectedValues, processedValue];
						if (onChange) {
							onChange(
								newValues as any,
								newValues.map((v) => ({ label: v, value: v })),
							);
						}
					}
				}

				setSearchText('');
				return;
			}

			// Normal single value handling
			setSearchText(value.trim());
			if (!isOpen) {
				setIsOpen(true);
			}
			if (onSearch) onSearch(value.trim());
		},
		[onSearch, isOpen, selectedValues, onChange],
	);

	// ===== UI & Rendering Functions =====

	/**
	 * Highlights matched text in search results
	 */
	const highlightMatchedText = useCallback(
		(text: string, searchQuery: string): React.ReactNode => {
			if (!searchQuery || !highlightSearch) return text;

			const parts = text.split(
				new RegExp(
					`(${searchQuery.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`,
					'gi',
				),
			);
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

	// Adjusted handleSelectAll for internal change handler
	const handleSelectAll = useCallback((): void => {
		if (!options) return;

		if (isAllSelected) {
			// If all are selected, deselect all
			handleInternalChange([]);
		} else {
			// Otherwise, select all
			handleInternalChange([ALL_SELECTED_VALUE]);
		}
	}, [options, isAllSelected, handleInternalChange]);

	/**
	 * Renders an individual option
	 */
	const renderOptionItem = useCallback(
		(
			option: OptionData,
			isSelected: boolean,
			index?: number,
		): React.ReactElement => {
			const isActive = index === activeIndex;
			const optionId = `option-${index}`;

			const handleItemSelection = (source?: string): void => {
				// Special handling for ALL option is done by the caller

				if (!option.value) return;

				if (source === 'option') {
					if (
						currentToggleTagValue({ option: option.value }) === ToggleTagValue.All
					) {
						handleSelectAll();
					} else {
						const newValues = [option.value];

						if (onChange) {
							onChange(
								newValues,
								newValues.map((v) => ({ label: v, value: v })),
							);
						}
					}
					return;
				}

				const newValues = selectedValues.includes(option.value)
					? selectedValues.filter((v) => v !== option.value)
					: [...selectedValues, option.value];

				if (onChange) {
					onChange(
						newValues,
						newValues.map(
							(v) => options.find((o) => o.value === v) ?? { label: v, value: v },
						),
					);
				}
			};

			return (
				<div
					key={option.value || `option-${index}`}
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
						e.preventDefault();
						handleItemSelection('option');
						setActiveChipIndex(-1);
						setActiveIndex(-1);
					}}
					onKeyDown={(e): void => {
						if ((e.key === 'Enter' || e.key === SPACEKEY) && isActive) {
							e.stopPropagation();
							e.preventDefault();
							handleItemSelection();
						}
					}}
					onMouseEnter={(): void => {
						setActiveIndex(index ?? -1);
						setActiveChipIndex(-1); // Clear chip selection when hovering ALL option
					}}
					role="option"
					aria-selected={isSelected}
					aria-disabled={option.disabled}
					tabIndex={isActive ? 0 : -1}
				>
					<Checkbox
						checked={isSelected}
						className="option-checkbox"
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							handleItemSelection('checkbox');
							setActiveChipIndex(-1);
							setActiveIndex(-1);
						}}
					>
						<div className="option-content">
							<Typography.Text
								ellipsis={{
									tooltip: {
										placement: 'right',
										autoAdjustOverflow: true,
									},
								}}
								className="option-label-text"
							>
								{highlightMatchedText(String(option.label || ''), searchText)}
							</Typography.Text>
							{(option.type === 'custom' || option.type === 'regex') && (
								<div className="option-badge">{capitalize(option.type)}</div>
							)}
							{option.value && ensureValidOption(option.value) && (
								<Button type="text" className="only-btn">
									{currentToggleTagValue({ option: option.value })}
								</Button>
							)}
							<Button type="text" className="toggle-btn">
								Toggle
							</Button>
						</div>
					</Checkbox>
				</div>
			);
		},
		[
			activeIndex,
			highlightMatchedText,
			searchText,
			ensureValidOption,
			currentToggleTagValue,
			selectedValues,
			onChange,
			handleSelectAll,
			options,
		],
	);

	/**
	 * Helper function to render option with index tracking
	 */
	const renderOptionWithIndex = useCallback(
		(option: OptionData, isSelected: boolean, idx: number) =>
			renderOptionItem(option, isSelected, idx),
		[renderOptionItem],
	);

	// Helper function to get visible chip indices
	const getVisibleChipIndices = useCallback((): number[] => {
		// If no values, return empty array
		if (selectedValues.length === 0) return [];

		// If maxTagCount is set and greater than 0, only return the first maxTagCount indices
		const visibleCount =
			maxTagCount !== undefined && maxTagCount > 0
				? Math.min(maxTagCount, selectedValues.length)
				: selectedValues.length;

		return Array.from({ length: visibleCount }, (_, i) => i);
	}, [selectedValues.length, maxTagCount]);

	// Get the last visible chip index
	const getLastVisibleChipIndex = useCallback((): number => {
		const visibleIndices = getVisibleChipIndices();
		return visibleIndices.length > 0
			? visibleIndices[visibleIndices.length - 1]
			: -1;
	}, [getVisibleChipIndices]);

	// Enhanced keyboard navigation with support for maxTagCount
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>): void => {
			// Get flattened list of all selectable options
			const getFlatOptions = (): OptionData[] => {
				if (!visibleOptions) return [];

				const flatList: OptionData[] = [];
				const hasAll = enableAllSelection && !searchText;

				// Process options
				const { sectionOptions, nonSectionOptions } = splitOptions(visibleOptions);

				// Add all options to flat list
				if (hasAll) {
					flatList.push({
						label: 'ALL',
						value: '__all__', // Special value for the ALL option
						type: 'defined',
					});
				}

				// Add Regex to flat list
				if (!isEmpty(searchText)) {
					// Only add regex wrapper if it doesn't already look like a regex pattern
					const isAlreadyRegex =
						searchText.startsWith('.*') && searchText.endsWith('.*');

					if (!isAlreadyRegex) {
						flatList.push({
							label: `.*${searchText}.*`,
							value: `.*${searchText}.*`,
							type: 'regex',
						});
					}
				}

				flatList.push(...nonSectionOptions);
				sectionOptions.forEach((section) => {
					if (section.options) {
						flatList.push(...section.options);
					}
				});

				return flatList;
			};

			const flatOptions = getFlatOptions();

			// Get the active input element to check cursor position
			const activeElement = document.activeElement as HTMLInputElement;
			const isInputActive = activeElement?.tagName === 'INPUT';
			const cursorAtStart = isInputActive && activeElement?.selectionStart === 0;
			const hasInputText = isInputActive && !!activeElement?.value;

			// Get indices of visible chips
			const visibleIndices = getVisibleChipIndices();
			const lastVisibleChipIndex = getLastVisibleChipIndex();

			// Handle special keyboard combinations
			const isCtrlOrCmd = e.ctrlKey || e.metaKey;

			// Handle Ctrl+A (select all)
			if (isCtrlOrCmd && e.key === 'a') {
				e.preventDefault();
				e.stopPropagation();

				// If there are chips, select them all
				if (selectedValues.length > 0) {
					selectAllChips();
					return;
				}

				// Otherwise let the default select all behavior happen
				return;
			}

			// Handle copy/cut operations
			if (isCtrlOrCmd && selectedChips.length > 0) {
				if (e.key === 'c') {
					e.preventDefault();
					e.stopPropagation();
					handleCopy();
					return;
				}

				if (e.key === 'x') {
					e.preventDefault();
					e.stopPropagation();
					handleCut();
					return;
				}
			}

			// Handle deletion of selected chips
			if (
				(e.key === 'Backspace' || e.key === 'Delete') &&
				selectedChips.length > 0
			) {
				e.preventDefault();
				e.stopPropagation();

				// Remove all the selected chips
				const newValues = selectedValues.filter(
					(_, index) => !selectedChips.includes(index),
				);

				if (onChange) {
					onChange(
						newValues as any,
						newValues.map((v) => ({ label: v, value: v })),
					);
				}

				// Clear selection after deletion
				clearSelection();
				return;
			}

			// Handle selection with Shift + Arrow keys
			if (e.shiftKey) {
				// Only handle chip selection if we have chips and either a chip is active
				// or we're at the start of an empty/unselected input
				const canHandleChipSelection =
					selectedValues.length > 0 &&
					(activeChipIndex >= 0 || (cursorAtStart && !hasInputText));

				if (canHandleChipSelection) {
					switch (e.key) {
						case 'ArrowLeft': {
							e.preventDefault();
							e.stopPropagation();

							// Start selection if not in selection mode
							if (!isSelectionMode) {
								const start =
									activeChipIndex >= 0 ? activeChipIndex : lastVisibleChipIndex;
								// Start selection with current chip and immediate neighbor
								// If we're starting from an active chip, select it and the one to its left
								if (activeChipIndex >= 0 && activeChipIndex > 0) {
									setSelectionStart(activeChipIndex);
									setSelectionEnd(activeChipIndex - 1);
									setSelectedChips(
										getIndicesBetween(activeChipIndex, activeChipIndex - 1),
									);
									setIsSelectionMode(true);
									setActiveChipIndex(activeChipIndex - 1);
								} else {
									// Fall back to single selection for edge cases
									startSelection(start);
								}
							} else {
								// Extend selection to the left
								const newEnd = Math.max(0, selectionEnd - 1);
								extendSelection(newEnd);
							}
							return;
						}

						case 'ArrowRight': {
							e.preventDefault();
							e.stopPropagation();

							// Start selection if not in selection mode
							if (!isSelectionMode) {
								const start = activeChipIndex >= 0 ? activeChipIndex : 0;
								// Start selection with current chip and immediate neighbor
								// If we're starting from an active chip, select it and the one to its right
								if (activeChipIndex >= 0 && activeChipIndex < lastVisibleChipIndex) {
									setSelectionStart(activeChipIndex);
									setSelectionEnd(activeChipIndex + 1);
									setSelectedChips(
										getIndicesBetween(activeChipIndex, activeChipIndex + 1),
									);
									setIsSelectionMode(true);
									setActiveChipIndex(activeChipIndex + 1);
								} else {
									// Fall back to single selection for edge cases
									startSelection(start);
								}
							}
							// Extend selection to the right if not at last chip
							else if (selectionEnd < lastVisibleChipIndex) {
								const newEnd = selectionEnd + 1;
								extendSelection(newEnd);
							} else {
								// Move focus to input when extending past last chip
								clearSelection();
								setActiveChipIndex(-1);
								if (selectRef.current) {
									selectRef.current.focus();
								}
							}

							return;
						}

						case 'Home': {
							e.preventDefault();
							e.stopPropagation();

							// Start or extend selection to beginning
							if (!isSelectionMode) {
								startSelection(0);
							} else {
								extendSelection(0);
							}
							return;
						}

						case 'End': {
							e.preventDefault();
							e.stopPropagation();

							// Start or extend selection to end
							if (!isSelectionMode) {
								startSelection(lastVisibleChipIndex);
							} else {
								extendSelection(lastVisibleChipIndex);
							}
							return;
						}

						default:
							break;
					}
				}
			}
			// If any key is pressed without shift/ctrl and we're in selection mode, clear selection
			else if (isSelectionMode) {
				// Don't clear selection on navigation keys
				const isNavigationKey = [
					'ArrowLeft',
					'ArrowRight',
					'ArrowUp',
					'ArrowDown',
					'Home',
					'End',
				].includes(e.key);
				if (!isNavigationKey) {
					clearSelection();
				}
			}

			// Handle up/down keys to open dropdown from input
			if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isOpen) {
				e.stopPropagation();
				e.preventDefault();
				setIsOpen(true);
				setActiveIndex(0);
				setActiveChipIndex(-1);
				clearSelection();
				return;
			}

			// Handle chip navigation when active
			if (activeChipIndex >= 0 && selectedValues.length > 0) {
				// Prepare variables for potential use in multiple case blocks
				let newValues: string[] = [];

				switch (e.key) {
					case 'ArrowLeft':
						e.stopPropagation();
						e.preventDefault();

						// Only navigate within the visible chip range
						if (activeChipIndex > 0 && visibleIndices.includes(activeChipIndex - 1)) {
							// Move to previous visible chip
							setActiveChipIndex(activeChipIndex - 1);
						} else {
							// Wrap around to last visible chip
							setActiveChipIndex(lastVisibleChipIndex);
						}

						clearSelection();
						break;

					case 'ArrowRight':
						e.stopPropagation();
						e.preventDefault();

						// Only navigate within the visible chip range
						if (activeChipIndex < lastVisibleChipIndex) {
							// Move to next visible chip
							setActiveChipIndex(activeChipIndex + 1);
						} else {
							// Move from last chip to input
							setActiveChipIndex(-1);
							clearSelection();
							if (selectRef.current) {
								selectRef.current.focus();
							}
						}

						clearSelection();
						break;
					case 'Backspace':
					case 'Delete':
						// Remove the active chip
						e.stopPropagation();
						e.preventDefault();
						newValues = selectedValues.filter(
							(_, index) => index !== activeChipIndex,
						);
						if (onChange) {
							onChange(newValues as any, newValues as any);
						}
						// If we deleted the last chip, move focus to previous
						if (activeChipIndex >= newValues.length) {
							setActiveChipIndex(
								newValues.length > 0
									? Math.min(activeChipIndex - 1, lastVisibleChipIndex)
									: -1,
							);
						}
						clearSelection();
						break;
					case 'Escape':
						// Clear chip selection
						setActiveChipIndex(-1);
						clearSelection();
						break;
					case 'ArrowDown':
					case 'ArrowUp':
						// Switch from chip to dropdown navigation
						if (isOpen) {
							setActiveChipIndex(-1);
							setActiveIndex(0);
						} else {
							setIsOpen(true);
							setActiveChipIndex(-1);
							setActiveIndex(0);
						}
						clearSelection();
						break;
					default:
						// If user types a letter when chip is active, focus the input field
						if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(-1);
							clearSelection();
							// Try to focus on the input field
							if (selectRef.current) {
								// Focus select which will in turn focus the input
								selectRef.current.focus();
							}
						}
						break;
				}
				return; // Early return when navigating chips
			}

			// Handle dropdown navigation when open
			if (isOpen) {
				switch (e.key) {
					case 'ArrowDown':
						e.stopPropagation();
						e.preventDefault();
						setActiveIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
						setActiveChipIndex(-1);
						clearSelection();
						break;

					case 'ArrowUp':
						e.stopPropagation();
						e.preventDefault();
						setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
						setActiveChipIndex(-1);
						clearSelection();
						break;

					case 'Tab':
						// Tab navigation with Shift key support
						if (e.shiftKey) {
							e.stopPropagation();
							e.preventDefault();
							setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
						} else {
							e.stopPropagation();
							e.preventDefault();
							setActiveIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
						}
						setActiveChipIndex(-1);
						clearSelection();
						break;

					case 'Enter':
						e.stopPropagation();
						e.preventDefault();

						// If there's an active option in the dropdown, prioritize selecting it
						if (activeIndex >= 0 && activeIndex < flatOptions.length) {
							const selectedOption = flatOptions[activeIndex];
							if (selectedOption.value === '__all__') {
								handleSelectAll();
							} else if (selectedOption.value && onChange) {
								const newValues = selectedValues.includes(selectedOption.value)
									? selectedValues.filter((v) => v !== selectedOption.value)
									: [...selectedValues, selectedOption.value];
								onChange(newValues as any, newValues as any);
							}
						} else if (searchText.trim()) {
							const trimmedValue = searchText.trim();
							// Check if value already exists in selectedValues
							if (!selectedValues.includes(trimmedValue)) {
								const newValues = [...selectedValues, trimmedValue];
								if (onChange) {
									onChange(
										newValues as any,
										newValues.map((v) => ({ label: v, value: v })),
									);
								}
							}
							setSearchText('');
						}

						break;

					case 'Escape':
						e.stopPropagation();
						e.preventDefault();
						setIsOpen(false);
						setActiveIndex(-1);
						break;

					case SPACEKEY:
						if (activeIndex >= 0 && activeIndex < flatOptions.length) {
							e.stopPropagation();
							e.preventDefault();
							const selectedOption = flatOptions[activeIndex];

							// Check if it's the ALL option
							if (selectedOption.value === '__all__') {
								handleSelectAll();
							} else if (selectedOption.value && onChange) {
								const newValues = selectedValues.includes(selectedOption.value)
									? selectedValues.filter((v) => v !== selectedOption.value)
									: [...selectedValues, selectedOption.value];

								onChange(newValues as any, newValues as any);
							}
							// Don't close dropdown, just update selection
						}
						break;

					case 'ArrowLeft':
						// If at start of input, move to chips
						if (cursorAtStart && visibleIndices.length > 0 && !hasInputText) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(lastVisibleChipIndex);
							setActiveIndex(-1);
						}
						break;

					case 'ArrowRight':
						// Start chip navigation when right arrow is pressed and we have chips to navigate
						if (visibleIndices.length > 0 && !hasInputText) {
							e.stopPropagation();
							e.preventDefault();
							// Navigate to the first chip
							setActiveChipIndex(0);
							setActiveIndex(-1);
						}
						break;

					default:
						break;
				}
			} else {
				// Handle keyboard events when dropdown is closed
				switch (e.key) {
					case 'ArrowDown':
					case 'ArrowUp':
						// Open dropdown when Down is pressed while closed
						e.stopPropagation();
						e.preventDefault();
						setIsOpen(true);
						setActiveIndex(0);
						setActiveChipIndex(-1);
						break;

					case 'ArrowLeft':
						// Start chip navigation if at start of input and no text or empty input
						if ((cursorAtStart || !hasInputText) && visibleIndices.length > 0) {
							e.stopPropagation();
							e.preventDefault();
							// Navigate to the last visible chip - this is what skips the "+N more" chip
							setActiveChipIndex(lastVisibleChipIndex);
							setActiveIndex(-1);
						}
						break;

					case 'ArrowRight':
						// No special handling needed for right arrow when dropdown is closed
						break;

					case 'Tab':
						// When dropdown is closed and Tab is pressed, we should not capture it
						// Let the browser handle the tab navigation
						break;

					case 'Backspace':
						// If at start of input and no text, select last chip
						if (cursorAtStart && !hasInputText && visibleIndices.length > 0) {
							e.stopPropagation();
							e.preventDefault();
							setActiveChipIndex(lastVisibleChipIndex);
							setActiveIndex(-1);
						}
						break;

					case 'Escape':
						// Clear focus when dropdown is closed
						setActiveChipIndex(-1);
						setActiveIndex(-1);
						break;

					default:
						break;
				}
			}
		},
		[
			selectedChips,
			isSelectionMode,
			isOpen,
			activeChipIndex,
			selectedValues,
			visibleOptions,
			enableAllSelection,
			searchText,
			splitOptions,
			selectAllChips,
			handleCopy,
			handleCut,
			onChange,
			clearSelection,
			getIndicesBetween,
			startSelection,
			selectionEnd,
			extendSelection,
			activeIndex,
			handleSelectAll,
			getVisibleChipIndices,
			getLastVisibleChipIndex,
		],
	);

	// Handle dropdown clicks
	const handleDropdownClick = useCallback((e: React.MouseEvent): void => {
		e.stopPropagation();
	}, []);

	// Add mousedown handler to the dropdown container
	const handleDropdownMouseDown = useCallback((e: React.MouseEvent): void => {
		e.preventDefault(); // Prevent focus change
		isClickInsideDropdownRef.current = true;
	}, []);

	// Handle blur with the flag
	const handleBlur = useCallback((): void => {
		if (isClickInsideDropdownRef.current) {
			isClickInsideDropdownRef.current = false;
			return;
		}
		// Handle actual blur
		setIsOpen(false);
	}, []);

	// Custom dropdown render with sections support
	const customDropdownRender = useCallback((): React.ReactElement => {
		// Process options based on current search
		const processedOptions =
			selectedValues.length > 0 && isEmpty(searchText)
				? prioritizeOrAddOptionForMultiSelect(filteredOptions, selectedValues)
				: filteredOptions;

		const { sectionOptions, nonSectionOptions } = splitOptions(processedOptions);

		// Check if we need to add a custom option based on search text
		const isSearchTextNotPresent =
			!isEmpty(searchText) && !isLabelPresent(processedOptions, searchText);

		// We will add these options in this order, which will be reflected in the UI
		const customOptions: OptionData[] = [];

		// add regex options first since they appear first in the UI
		if (!isEmpty(searchText)) {
			// Only add regex wrapper if it doesn't already look like a regex pattern
			const isAlreadyRegex =
				searchText.startsWith('.*') && searchText.endsWith('.*');

			if (!isAlreadyRegex) {
				customOptions.push({
					label: `.*${searchText}.*`,
					value: `.*${searchText}.*`,
					type: 'regex',
				});
			}
		}

		// add custom option next
		if (isSearchTextNotPresent) {
			customOptions.push({
				label: searchText,
				value: searchText,
				type: 'custom',
			});
		}

		// Now add all custom options at the beginning
		const enhancedNonSectionOptions = [...customOptions, ...nonSectionOptions];

		const allOptionValues = getAllAvailableValues(processedOptions);
		const allOptionsSelected =
			allOptionValues.length > 0 &&
			allOptionValues.every((val) => selectedValues.includes(val));

		// Determine if ALL option should be shown
		const showAllOption = enableAllSelection && !searchText;

		// Initialize optionIndex based on whether the ALL option is shown
		// If ALL option is shown, it gets index 0, and other options start at index 1
		let optionIndex = showAllOption ? 1 : 0;

		// Helper function to map options with index tracking
		const mapOptions = (options: OptionData[]): React.ReactNode =>
			options.map((option) => {
				const optionValue = option.value || '';
				const result = renderOptionWithIndex(
					option,
					selectedValues.includes(optionValue),
					optionIndex,
				);
				optionIndex += 1;
				return result;
			});

		const customMenu = (
			<div
				ref={dropdownRef}
				className="custom-multiselect-dropdown"
				onMouseDown={handleDropdownMouseDown}
				onClick={handleDropdownClick}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				role="listbox"
				aria-multiselectable="true"
				aria-activedescendant={
					activeIndex >= 0 ? `option-${activeIndex}` : undefined
				}
				tabIndex={-1}
			>
				{/* ALL checkbox only when search is empty */}
				{showAllOption && (
					<>
						<div
							className={cx('option-item all-option', {
								selected: allOptionsSelected,
								active: activeIndex === 0,
							})}
							key={`all-option-${allOptionsSelected}`}
							id="option-0"
							onMouseEnter={(): void => {
								setActiveIndex(0);
								setActiveChipIndex(-1); // Clear chip selection when hovering ALL option
							}}
							role="option"
							aria-selected={allOptionsSelected}
							tabIndex={0}
							ref={(el): void => {
								optionRefs.current[0] = el;
							}}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								handleSelectAll();
							}}
							onKeyDown={(e): void => {
								if ((e.key === 'Enter' || e.key === SPACEKEY) && activeIndex === 0) {
									e.stopPropagation();
									e.preventDefault();
									handleSelectAll();
								}
							}}
						>
							<Checkbox
								checked={allOptionsSelected}
								style={{ width: '100%', height: '100%' }}
							>
								<div className="option-content">
									<div>ALL</div>
								</div>
							</Checkbox>
						</div>
						<div className="divider" />
					</>
				)}

				{/* Non-section options when not searching */}
				{enhancedNonSectionOptions.length > 0 && (
					<div className="no-section-options">
						{mapOptions(enhancedNonSectionOptions)}
					</div>
				)}

				{/* Section options when not searching */}
				{sectionOptions.length > 0 &&
					sectionOptions.map((section) =>
						!isEmpty(section.options) ? (
							<div className="select-group" key={section.label}>
								<div className="group-label" role="heading" aria-level={2}>
									{section.label}
								</div>
								<div role="group" aria-label={`${section.label} options`}>
									{section.options && mapOptions(section.options)}
								</div>
							</div>
						) : null,
					)}

				{/* Navigation help footer */}
				<div className="navigation-footer" role="note">
					{!loading && !errorMessage && !noDataMessage && (
						<section className="navigate">
							<ArrowDown size={8} className="icons" />
							<ArrowUp size={8} className="icons" />
							<ArrowLeft size={8} className="icons" />
							<ArrowRight size={8} className="icons" />
							<span className="keyboard-text">to navigate</span>
						</section>
					)}
					{loading && (
						<div className="navigation-loading">
							<div className="navigation-icons">
								<LoadingOutlined />
							</div>
							<div className="navigation-text">We are updating the values...</div>
						</div>
					)}
					{errorMessage && !loading && (
						<div className="navigation-error">
							<div className="navigation-text">
								{errorMessage || SOMETHING_WENT_WRONG}
							</div>
							<div className="navigation-icons">
								<ReloadOutlined
									twoToneColor={Color.BG_CHERRY_400}
									onClick={(e): void => {
										e.stopPropagation();
										if (onRetry) onRetry();
									}}
								/>
							</div>
						</div>
					)}

					{noDataMessage && !loading && (
						<div className="navigation-text">{noDataMessage}</div>
					)}
				</div>
			</div>
		);

		return dropdownRender ? dropdownRender(customMenu) : customMenu;
	}, [
		selectedValues,
		searchText,
		filteredOptions,
		splitOptions,
		isLabelPresent,
		getAllAvailableValues,
		enableAllSelection,
		handleDropdownMouseDown,
		handleDropdownClick,
		handleKeyDown,
		handleBlur,
		activeIndex,
		loading,
		errorMessage,
		noDataMessage,
		dropdownRender,
		renderOptionWithIndex,
		handleSelectAll,
		onRetry,
	]);

	// ===== Side Effects =====

	// Clear search when dropdown closes
	useEffect(() => {
		if (!isOpen) {
			setSearchText('');
			setActiveIndex(-1);
			// Don't clear activeChipIndex when dropdown closes to maintain tag focus
		} else {
			// When opening dropdown, clear chip selection
			setActiveChipIndex(-1);
		}
	}, [isOpen]);

	// Auto-scroll active option into view
	useEffect(() => {
		if (isOpen && activeIndex >= 0 && optionRefs.current[activeIndex]) {
			optionRefs.current[activeIndex]?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	}, [isOpen, activeIndex]);

	// Add document level event listeners to handle clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent): void => {
			// Find the select element by its class
			const selectElement = document.querySelector('.custom-multiselect');

			// If we're in selection mode and the click is outside the component, clear selection
			if (
				isSelectionMode &&
				selectElement &&
				!selectElement.contains(e.target as Node)
			) {
				clearSelection();
			}
		};

		const handleKeyDown = (e: KeyboardEvent): void => {
			// Clear selection when Escape is pressed
			if (e.key === 'Escape' && isSelectionMode) {
				clearSelection();
			}
		};

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);

		return (): void => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isSelectionMode, clearSelection]);

	// ===== Final Processing =====

	// Custom Tag Render (needs significant updates)
	const tagRender = useCallback(
		(props: CustomTagProps): React.ReactElement => {
			const { label, value, closable, onClose } = props;

			// If the display value is the special ALL value, render the ALL tag
			if (value === ALL_SELECTED_VALUE && isAllSelected) {
				const handleAllTagClose = (
					e: React.MouseEvent | React.KeyboardEvent,
				): void => {
					e.stopPropagation();
					e.preventDefault();
					handleInternalChange([]); // Clear selection when ALL tag is closed
				};

				const handleAllTagKeyDown = (e: React.KeyboardEvent): void => {
					if (e.key === 'Enter' || e.key === SPACEKEY) {
						handleAllTagClose(e);
					}
					// Prevent Backspace/Delete propagation if needed, handle in main keydown handler
				};

				return (
					<div
						className={cx('ant-select-selection-item', {
							'ant-select-selection-item-active': activeChipIndex === 0, // Treat ALL tag as index 0 when active
							'ant-select-selection-item-selected': selectedChips.includes(0),
						})}
						style={
							activeChipIndex === 0 || selectedChips.includes(0)
								? {
										borderColor: Color.BG_ROBIN_500,
										backgroundColor: Color.BG_SLATE_400,
								  }
								: undefined
						}
					>
						<span className="ant-select-selection-item-content">ALL</span>
						{closable && (
							<span
								className="ant-select-selection-item-remove"
								onClick={handleAllTagClose}
								onKeyDown={handleAllTagKeyDown}
								role="button"
								tabIndex={0}
								aria-label="Remove ALL tag (deselect all)"
							>
								×
							</span>
						)}
					</div>
				);
			}

			// If not isAllSelected, render individual tags using previous logic
			// but base indices/visibility on the original `selectedValues`
			if (!isAllSelected) {
				const index = selectedValues.indexOf(value);
				if (index === -1) return <div style={{ display: 'none' }} />; // Should not happen if value comes from displayValue

				const isActive = index === activeChipIndex;
				const isSelected = selectedChips.includes(index);

				const isPlusNTag =
					typeof value === 'string' &&
					value.startsWith('+') &&
					!selectedValues.includes(value);

				if (isPlusNTag) {
					// Render the "+N more" tag as before
					return (
						<div className="ant-select-selection-item">
							<span className="ant-select-selection-item-content">{label}</span>
						</div>
					);
				}

				// Check visibility based on original selectedValues length and maxTagCount
				const visibleCount =
					maxTagCount !== undefined && maxTagCount > 0
						? Math.min(maxTagCount, selectedValues.length)
						: selectedValues.length;
				const isVisible = index < visibleCount;

				if (!isVisible) {
					return <div style={{ display: 'none' }} />;
				}

				const handleTagKeyDown = (e: React.KeyboardEvent): void => {
					if (e.key === 'Enter' || e.key === SPACEKEY) {
						e.stopPropagation();
						e.preventDefault();
						onClose(); // Default close action removes the specific tag
					}
				};

				return (
					<div
						className={cx('ant-select-selection-item', {
							'ant-select-selection-item-active': isActive,
							'ant-select-selection-item-selected': isSelected,
						})}
						style={
							isActive || isSelected
								? {
										borderColor: Color.BG_ROBIN_500,
										backgroundColor: Color.BG_SLATE_400,
								  }
								: undefined
						}
					>
						<span className="ant-select-selection-item-content">{label}</span>
						{closable && (
							<span
								className="ant-select-selection-item-remove"
								onClick={onClose} // Default Ant close handler
								onKeyDown={handleTagKeyDown}
								role="button"
								tabIndex={0}
								aria-label={`Remove tag ${label}`}
							>
								×
							</span>
						)}
					</div>
				);
			}

			// Fallback for safety, should not be reached
			return <div />;
		},
		[
			isAllSelected,
			handleInternalChange,
			activeChipIndex,
			selectedChips,
			selectedValues,
			maxTagCount,
		],
	);

	// ===== Component Rendering =====
	return (
		<Select
			ref={selectRef}
			className={cx('custom-multiselect', className, {
				'has-selection': selectedChips.length > 0 && !isAllSelected,
				'is-all-selected': isAllSelected,
			})}
			placeholder={placeholder}
			mode="multiple"
			showSearch
			filterOption={false}
			onSearch={handleSearch}
			value={displayValue}
			onChange={handleInternalChange}
			onClear={(): void => handleInternalChange([])}
			onDropdownVisibleChange={setIsOpen}
			open={isOpen}
			defaultActiveFirstOption={defaultActiveFirstOption}
			popupMatchSelectWidth={dropdownMatchSelectWidth}
			allowClear={allowClear}
			getPopupContainer={getPopupContainer ?? popupContainer}
			suffixIcon={<DownOutlined style={{ cursor: 'default' }} />}
			dropdownRender={customDropdownRender}
			menuItemSelectedIcon={null}
			popupClassName={cx('custom-multiselect-dropdown-container', popupClassName)}
			notFoundContent={<div className="empty-message">{noDataMessage}</div>}
			onKeyDown={handleKeyDown}
			tagRender={tagRender as any}
			placement={placement}
			listHeight={300}
			searchValue={searchText}
			maxTagTextLength={maxTagTextLength}
			maxTagCount={isAllSelected ? 1 : maxTagCount}
			{...rest}
		/>
	);
};

export default CustomMultiSelect;

/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-nested-ternary */
import './DashboardVariableSelection.styles.scss';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useDebounce from 'hooks/useDebounce';
import { isEmpty, isUndefined } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';
import { isRetryableError as checkIfRetryableError } from 'utils/errorUtils';
import { popupContainer } from 'utils/selectPopupContainer';

import { ALL_SELECT_VALUE } from '../utils';
import { SelectItemStyle } from './styles';
import {
	areArraysEqual,
	getOptionsForDynamicVariable,
	uniqueValues,
} from './util';
import { getSelectValue } from './VariableItem';

interface DynamicVariableSelectionProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string,
		id: string,
		arg1: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		haveCustomValuesSelected?: boolean,
	) => void;
}

function DynamicVariableSelection({
	variableData,
	onValueUpdate,
	existingVariables,
}: DynamicVariableSelectionProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);

	const [errorMessage, setErrorMessage] = useState<null | string>(null);
	const [isRetryableError, setIsRetryableError] = useState<boolean>(true);

	const [isComplete, setIsComplete] = useState<boolean>(false);

	const [filteredOptionsData, setFilteredOptionsData] = useState<
		(string | number | boolean)[]
	>([]);

	const [relatedValues, setRelatedValues] = useState<string[]>([]);
	const [originalRelatedValues, setOriginalRelatedValues] = useState<string[]>(
		[],
	);

	const [tempSelection, setTempSelection] = useState<
		string | string[] | undefined
	>(undefined);

	// Track dropdown open state for auto-checking new values
	const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

	// Create a dependency key from all dynamic variables
	const dynamicVariablesKey = useMemo(() => {
		if (!existingVariables) return 'no_variables';

		const dynamicVars = Object.values(existingVariables)
			.filter((v) => v.type === 'DYNAMIC')
			.map(
				(v) => `${v.name || 'unnamed'}:${JSON.stringify(v.selectedValue || null)}`,
			)
			.join('|');

		return dynamicVars || 'no_dynamic_variables';
	}, [existingVariables]);

	const [apiSearchText, setApiSearchText] = useState<string>('');

	const debouncedApiSearchText = useDebounce(apiSearchText, DEBOUNCE_DELAY);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// existing query is the query made from the other dynamic variables around this one with there current values
	// for e.g. k8s.namespace.name IN ["zeus", "gene"] AND doc_op_type IN ["test"]
	const existingQuery = useMemo(() => {
		if (!existingVariables || !variableData.dynamicVariablesAttribute) {
			return '';
		}

		const queryParts: string[] = [];

		Object.entries(existingVariables).forEach(([, variable]) => {
			// Skip the current variable being processed
			if (variable.id === variableData.id) {
				return;
			}

			// Only include dynamic variables that have selected values and are not selected as ALL
			if (
				variable.type === 'DYNAMIC' &&
				variable.dynamicVariablesAttribute &&
				variable.selectedValue &&
				!isEmpty(variable.selectedValue) &&
				(variable.showALLOption ? !variable.allSelected : true)
			) {
				const attribute = variable.dynamicVariablesAttribute;
				const values = Array.isArray(variable.selectedValue)
					? variable.selectedValue
					: [variable.selectedValue];

				// Filter out empty values and convert to strings
				const validValues = values
					.filter((value) => value !== null && value !== undefined && value !== '')
					.map((value) => value.toString());

				if (validValues.length > 0) {
					// Format values for query - wrap strings in quotes, keep numbers as is
					const formattedValues = validValues.map((value) => {
						// Check if value is a number
						const numValue = Number(value);
						if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
							return value; // Keep as number
						}
						// Escape single quotes and wrap in quotes
						return `'${value.replace(/'/g, "\\'")}'`;
					});

					if (formattedValues.length === 1) {
						queryParts.push(`${attribute} = ${formattedValues[0]}`);
					} else {
						queryParts.push(`${attribute} IN [${formattedValues.join(', ')}]`);
					}
				}
			}
		});

		return queryParts.join(' AND ');
	}, [
		existingVariables,
		variableData.id,
		variableData.dynamicVariablesAttribute,
	]);

	const { isLoading, refetch } = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			variableData.name || `variable_${variableData.id}`,
			dynamicVariablesKey,
			minTime,
			maxTime,
			debouncedApiSearchText,
		],
		{
			enabled: variableData.type === 'DYNAMIC',
			queryFn: () =>
				getFieldValues(
					variableData.dynamicVariablesSource?.toLowerCase() === 'all telemetry'
						? undefined
						: (variableData.dynamicVariablesSource?.toLowerCase() as
								| 'traces'
								| 'logs'
								| 'metrics'),
					variableData.dynamicVariablesAttribute,
					debouncedApiSearchText,
					minTime,
					maxTime,
					existingQuery,
				),
			onSuccess: (data) => {
				const newNormalizedValues = data.data?.normalizedValues || [];
				const newRelatedValues = data.data?.relatedValues || [];

				if (!debouncedApiSearchText) {
					setOptionsData(newNormalizedValues);
					setIsComplete(data.data?.complete || false);
				}
				setFilteredOptionsData(newNormalizedValues);
				setRelatedValues(newRelatedValues);
				setOriginalRelatedValues(newRelatedValues);

				// Only run auto-check logic when necessary to avoid performance issues
				if (variableData.allSelected && isDropdownOpen) {
					// Build the latest full list from API (normalized + related)
					const latestValues = [
						...new Set([
							...newNormalizedValues.map((v) => v.toString()),
							...newRelatedValues.map((v) => v.toString()),
						]),
					];

					// Update temp selection to exactly reflect latest API values when ALL is active
					const currentStrings = Array.isArray(tempSelection)
						? tempSelection.map((v) => v.toString())
						: tempSelection
						? [tempSelection.toString()]
						: [];
					const areSame =
						currentStrings.length === latestValues.length &&
						latestValues.every((v) => currentStrings.includes(v));
					if (!areSame) {
						setTempSelection(latestValues);
					}
				}
			},
			onError: (error: any) => {
				if (error) {
					let message = SOMETHING_WENT_WRONG;
					if (error?.message) {
						message = error?.message;
					} else {
						message =
							'Please make sure configuration is valid and you have required setup and permissions';
					}
					setErrorMessage(message);

					// Check if error is retryable (5xx) or not (4xx)
					const isRetryable = checkIfRetryableError(error);
					setIsRetryableError(isRetryable);
				}
			},
		},
	);

	const handleChange = useCallback(
		(inputValue: string | string[]): void => {
			const value = variableData.multiSelect && !inputValue ? [] : inputValue;

			if (
				value === variableData.selectedValue ||
				(Array.isArray(value) &&
					Array.isArray(variableData.selectedValue) &&
					areArraysEqual(value, variableData.selectedValue))
			) {
				return;
			}

			if (variableData.name) {
				if (
					value === ALL_SELECT_VALUE ||
					(Array.isArray(value) && value.includes(ALL_SELECT_VALUE))
				) {
					// For ALL selection in dynamic variables, pass null to avoid storing values
					// The parent component will handle this appropriately
					onValueUpdate(variableData.name, variableData.id, null, true);
				} else {
					// Build union of available options shown in dropdown (normalized + related)
					const allAvailableOptionStrings = [
						...new Set([
							...optionsData.map((v) => v.toString()),
							...relatedValues.map((v) => v.toString()),
						]),
					];

					const haveCustomValuesSelected =
						Array.isArray(value) &&
						!value.every((v) => allAvailableOptionStrings.includes(v.toString()));

					onValueUpdate(
						variableData.name,
						variableData.id,
						value,
						allAvailableOptionStrings.every((v) => value.includes(v.toString())),
						haveCustomValuesSelected,
					);
				}
			}
		},
		[variableData, onValueUpdate, optionsData, relatedValues],
	);

	useEffect(() => {
		if (
			variableData.dynamicVariablesSource &&
			variableData.dynamicVariablesAttribute
		) {
			refetch();
		}
	}, [
		refetch,
		variableData.dynamicVariablesSource,
		variableData.dynamicVariablesAttribute,
		debouncedApiSearchText,
	]);

	// Build a memoized list of all currently available option strings (normalized + related)
	const allAvailableOptionStrings = useMemo(
		() => [
			...new Set([
				...optionsData.map((v) => v.toString()),
				...relatedValues.map((v) => v.toString()),
			]),
		],
		[optionsData, relatedValues],
	);

	const handleSearch = useCallback(
		(text: string) => {
			if (isComplete) {
				if (!text) {
					setFilteredOptionsData(optionsData);
					setRelatedValues(originalRelatedValues);
					return;
				}

				const localFilteredOptionsData: (string | number | boolean)[] = [];
				optionsData.forEach((option) => {
					if (option.toString().toLowerCase().includes(text.toLowerCase())) {
						localFilteredOptionsData.push(option);
					}
				});
				setFilteredOptionsData(localFilteredOptionsData);
				setRelatedValues(
					originalRelatedValues.filter((value) =>
						value.toLowerCase().includes(text.toLowerCase()),
					),
				);
			} else {
				setApiSearchText(text);
			}
		},
		[isComplete, optionsData, originalRelatedValues],
	);

	const { selectedValue } = variableData;
	const selectedValueStringified = useMemo(
		() => getSelectValue(selectedValue, variableData),
		[selectedValue, variableData],
	);

	const enableSelectAll = variableData.multiSelect && variableData.showALLOption;

	const selectValue =
		variableData.allSelected && enableSelectAll
			? ALL_SELECT_VALUE
			: selectedValueStringified;

	// Add a handler for tracking temporary selection changes
	const handleTempChange = useCallback(
		(inputValue: string | string[]): void => {
			// Store the selection in temporary state while dropdown is open
			const value = variableData.multiSelect && !inputValue ? [] : inputValue;
			const sanitizedValue = uniqueValues(value);
			setTempSelection(sanitizedValue);
		},
		[variableData.multiSelect],
	);

	// Handle dropdown visibility changes
	const handleDropdownVisibleChange = (visible: boolean): void => {
		// Update dropdown open state for auto-checking
		setIsDropdownOpen(visible);

		// Initialize temp selection when opening dropdown
		if (visible) {
			if (isUndefined(tempSelection) && selectValue === ALL_SELECT_VALUE) {
				// When ALL is selected, set selection to exactly the latest available values
				const latestAll = [...allAvailableOptionStrings];
				setTempSelection(latestAll);
			} else {
				setTempSelection(getSelectValue(variableData.selectedValue, variableData));
			}
		}
		// Apply changes when closing dropdown
		else if (!visible && tempSelection !== undefined) {
			// Only call handleChange if there's actually a change in the selection
			const currentValue = variableData.selectedValue;

			// Helper function to check if arrays have the same elements regardless of order
			const areArraysEqualIgnoreOrder = (a: any[], b: any[]): boolean => {
				if (a.length !== b.length) return false;
				const sortedA = [...a].sort();
				const sortedB = [...b].sort();
				return areArraysEqual(sortedA, sortedB);
			};

			// If ALL was selected before and remains ALL after, skip updating
			const wasAllSelected = enableSelectAll && variableData.allSelected;
			const isAllSelectedAfter =
				enableSelectAll &&
				Array.isArray(tempSelection) &&
				tempSelection.length === allAvailableOptionStrings.length &&
				allAvailableOptionStrings.every((v) => tempSelection.includes(v));

			if (wasAllSelected && isAllSelectedAfter) {
				setTempSelection(undefined);
				return;
			}

			const hasChanged =
				tempSelection !== currentValue &&
				!(
					Array.isArray(tempSelection) &&
					Array.isArray(currentValue) &&
					areArraysEqualIgnoreOrder(tempSelection, currentValue)
				);

			if (hasChanged) {
				handleChange(tempSelection);
			}
			setTempSelection(undefined);
		}

		// Always reset filtered data when dropdown closes, regardless of tempSelection state
		if (!visible) {
			setFilteredOptionsData(optionsData);
			setRelatedValues(originalRelatedValues);
			setApiSearchText('');
		}
	};

	useEffect(
		() => (): void => {
			// Cleanup on unmount
			setTempSelection(undefined);
			setFilteredOptionsData([]);
			setRelatedValues([]);
			setApiSearchText('');
		},
		[],
	);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const finalSelectedValues = useMemo(() => {
		if (variableData.multiSelect) {
			let value = tempSelection || selectedValue;
			if (isEmpty(value)) {
				if (variableData.showALLOption) {
					if (variableData.defaultValue) {
						value = variableData.defaultValue;
					} else if (variableData.allSelected) {
						// If ALL is selected but no stored values, derive from available options
						// This handles the case where we don't store values in localStorage for ALL
						value = allAvailableOptionStrings;
					} else {
						value = optionsData;
					}
				} else if (variableData.defaultValue) {
					value = variableData.defaultValue;
				} else {
					value = optionsData?.[0];
				}
			}

			return value;
		}
		if (isEmpty(selectedValue)) {
			if (variableData.defaultValue) {
				return variableData.defaultValue;
			}
			return optionsData[0]?.toString();
		}

		return selectedValue;
	}, [
		variableData.multiSelect,
		variableData.showALLOption,
		variableData.defaultValue,
		variableData.allSelected,
		selectedValue,
		tempSelection,
		optionsData,
		allAvailableOptionStrings,
	]);

	useEffect(() => {
		if (
			(variableData.multiSelect && !(tempSelection || selectValue)) ||
			isEmpty(selectValue)
		) {
			handleChange(finalSelectedValues as string[] | string);
		}
	}, [
		finalSelectedValues,
		handleChange,
		selectValue,
		tempSelection,
		variableData.multiSelect,
	]);

	return (
		<div className="variable-item">
			<Typography.Text className="variable-name" ellipsis>
				${variableData.name}
				{variableData.description && (
					<Tooltip title={variableData.description}>
						<InfoCircleOutlined className="info-icon" />
					</Tooltip>
				)}
			</Typography.Text>
			<div className="variable-value">
				{variableData.multiSelect ? (
					<CustomMultiSelect
						key={variableData.id}
						options={getOptionsForDynamicVariable(
							filteredOptionsData || [],
							relatedValues || [],
						)}
						defaultValue={variableData.defaultValue}
						onChange={handleTempChange}
						bordered={false}
						placeholder="Select value"
						placement="bottomLeft"
						style={SelectItemStyle}
						loading={isLoading}
						showSearch
						data-testid="variable-select"
						className="variable-select"
						popupClassName="dropdown-styles"
						maxTagCount={2}
						getPopupContainer={popupContainer}
						value={
							(tempSelection || selectValue) === ALL_SELECT_VALUE
								? 'ALL'
								: tempSelection || selectValue
						}
						onDropdownVisibleChange={handleDropdownVisibleChange}
						errorMessage={errorMessage}
						// eslint-disable-next-line react/no-unstable-nested-components
						maxTagPlaceholder={(omittedValues): JSX.Element => {
							const maxDisplayValues = 10;
							const valuesToShow = omittedValues.slice(0, maxDisplayValues);
							const hasMore = omittedValues.length > maxDisplayValues;
							const tooltipText =
								valuesToShow.map(({ value }) => value).join(', ') +
								(hasMore ? ` + ${omittedValues.length - maxDisplayValues} more` : '');

							return (
								<Tooltip title={tooltipText}>
									<span>+ {omittedValues.length} </span>
								</Tooltip>
							);
						}}
						onClear={(): void => {
							handleChange([]);
						}}
						enableAllSelection={enableSelectAll}
						maxTagTextLength={30}
						onSearch={handleSearch}
						onRetry={(): void => {
							setErrorMessage(null);
							setIsRetryableError(true);
							refetch();
						}}
						showIncompleteDataMessage={!isComplete && filteredOptionsData.length > 0}
						isDynamicVariable
						showRetryButton={isRetryableError}
					/>
				) : (
					<CustomSelect
						key={variableData.id}
						onChange={handleChange}
						bordered={false}
						placeholder="Select value"
						style={SelectItemStyle}
						loading={isLoading}
						showSearch
						data-testid="variable-select"
						className="variable-select"
						popupClassName="dropdown-styles"
						getPopupContainer={popupContainer}
						options={getOptionsForDynamicVariable(
							filteredOptionsData || [],
							relatedValues || [],
						)}
						value={selectValue}
						defaultValue={variableData.defaultValue}
						errorMessage={errorMessage}
						onSearch={handleSearch}
						// eslint-disable-next-line sonarjs/no-identical-functions
						onRetry={(): void => {
							setErrorMessage(null);
							setIsRetryableError(true);
							refetch();
						}}
						showIncompleteDataMessage={!isComplete && filteredOptionsData.length > 0}
						isDynamicVariable
						showRetryButton={isRetryableError}
					/>
				)}
			</div>
		</div>
	);
}

export default DynamicVariableSelection;

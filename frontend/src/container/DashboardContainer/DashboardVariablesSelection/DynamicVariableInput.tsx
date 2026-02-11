import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useDebounce from 'hooks/useDebounce';
import { isEmpty } from 'lodash-es';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { isRetryableError as checkIfRetryableError } from 'utils/errorUtils';

import SelectVariableInput from './SelectVariableInput';
import { useDashboardVariableSelectHelper } from './useDashboardVariableSelectHelper';
import { getOptionsForDynamicVariable } from './util';
import { VariableItemProps } from './VariableItem';
import { dynamicVariableSelectStrategy } from './variableSelectStrategy/dynamicVariableSelectStrategy';

import './DashboardVariableSelection.styles.scss';

type DynamicVariableInputProps = Pick<
	VariableItemProps,
	'variableData' | 'onValueUpdate' | 'existingVariables'
>;

// eslint-disable-next-line sonarjs/cognitive-complexity
function DynamicVariableInput({
	variableData,
	onValueUpdate,
	existingVariables,
}: DynamicVariableInputProps): JSX.Element {
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

	// Track dropdown open state for auto-checking new values
	const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

	const [apiSearchText, setApiSearchText] = useState<string>('');

	const debouncedApiSearchText = useDebounce(apiSearchText, DEBOUNCE_DELAY);

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

	const {
		value,
		tempSelection,
		setTempSelection,
		handleClear,
		enableSelectAll,
		defaultValue,
		applyDefaultIfNeeded,
		onChange,
		onDropdownVisibleChange,
	} = useDashboardVariableSelectHelper({
		variableData,
		optionsData,
		onValueUpdate,
		strategy: dynamicVariableSelectStrategy,
		allAvailableOptionStrings,
	});

	// Create a dependency key from all dynamic variables
	const dynamicVariablesKey = useMemo(() => {
		if (!existingVariables) {
			return 'no_variables';
		}

		const dynamicVars = Object.values(existingVariables)
			.filter((v) => v.type === 'DYNAMIC')
			.map(
				(v) => `${v.name || 'unnamed'}:${JSON.stringify(v.selectedValue || null)}`,
			)
			.join('|');

		return dynamicVars || 'no_dynamic_variables';
	}, [existingVariables]);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// existing query is the query made from the other dynamic variables around this one with there current values
	// for e.g. k8s.namespace.name IN ["zeus", "gene"] AND doc_op_type IN ["test"]
	// eslint-disable-next-line sonarjs/cognitive-complexity
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
					.filter((val) => val !== null && val !== undefined && val !== '')
					.map((val) => val.toString());

				if (validValues.length > 0) {
					// Format values for query - wrap strings in quotes, keep numbers as is
					const formattedValues = validValues.map((val) => {
						// Check if value is a number
						const numValue = Number(val);
						if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
							return val; // Keep as number
						}
						// Escape single quotes and wrap in quotes
						return `'${val.replace(/'/g, "\\'")}'`;
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

	// Wrap the hook's onDropdownVisibleChange to also track isDropdownOpen and handle cleanup
	const handleSelectDropdownVisibilityChange = useCallback(
		(visible: boolean): void => {
			setIsDropdownOpen(visible);

			onDropdownVisibleChange(visible);

			if (!visible) {
				setFilteredOptionsData(optionsData);
				setRelatedValues(originalRelatedValues);
				setApiSearchText('');
			}
		},
		[onDropdownVisibleChange, optionsData, originalRelatedValues],
	);

	const { isLoading, refetch } = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			variableData.name || `variable_${variableData.id}`,
			dynamicVariablesKey,
			minTime,
			maxTime,
			debouncedApiSearchText,
			variableData.dynamicVariablesSource,
			variableData.dynamicVariablesAttribute,
		],
		{
			enabled:
				variableData.type === 'DYNAMIC' &&
				!!variableData.dynamicVariablesSource &&
				!!variableData.dynamicVariablesAttribute,
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

				// Apply default if no value is selected (e.g., new variable, first load)
				if (!debouncedApiSearchText) {
					const allNewOptions = [
						...new Set([
							...newNormalizedValues.map((v) => v.toString()),
							...newRelatedValues.map((v) => v.toString()),
						]),
					];
					applyDefaultIfNeeded(allNewOptions);
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

	const handleRetry = useCallback((): void => {
		setErrorMessage(null);
		setIsRetryableError(true);
		refetch();
	}, [refetch]);

	const handleSearch = useCallback(
		(text: string) => {
			if (isComplete) {
				if (!text) {
					setFilteredOptionsData(optionsData);
					setRelatedValues(originalRelatedValues);
					return;
				}

				const lowerText = text.toLowerCase();
				setFilteredOptionsData(
					optionsData.filter((option) =>
						option.toString().toLowerCase().includes(lowerText),
					),
				);
				setRelatedValues(
					originalRelatedValues.filter((val) =>
						val.toLowerCase().includes(lowerText),
					),
				);
			} else {
				setApiSearchText(text);
			}
		},
		[isComplete, optionsData, originalRelatedValues],
	);

	const selectOptions = useMemo(
		() =>
			getOptionsForDynamicVariable(filteredOptionsData || [], relatedValues || []),
		[filteredOptionsData, relatedValues],
	);

	return (
		<SelectVariableInput
			variableId={variableData.id}
			options={selectOptions}
			value={value}
			onChange={onChange}
			onDropdownVisibleChange={handleSelectDropdownVisibilityChange}
			onClear={handleClear}
			enableSelectAll={enableSelectAll}
			defaultValue={defaultValue}
			isMultiSelect={variableData.multiSelect}
			// dynamic variable specific + API related props
			loading={isLoading}
			errorMessage={errorMessage}
			onRetry={handleRetry}
			isDynamicVariable
			showRetryButton={isRetryableError}
			showIncompleteDataMessage={!isComplete && filteredOptionsData.length > 0}
			onSearch={handleSearch}
		/>
	);
}

export default memo(DynamicVariableInput);

import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useVariableFetchState } from 'hooks/dashboard/useVariableFetchState';
import useDebounce from 'hooks/useDebounce';
import { AppState } from 'store/reducers';
import { SuccessResponseV2 } from 'types/api';
import { FieldValueResponse } from 'types/api/dynamicVariables/getFieldValues';
import { GlobalReducer } from 'types/reducer/globalTime';
import { isRetryableError as checkIfRetryableError } from 'utils/errorUtils';

import SelectVariableInput from './SelectVariableInput';
import { useDashboardVariableSelectHelper } from './useDashboardVariableSelectHelper';
import {
	buildExistingDynamicVariableQuery,
	extractErrorMessage,
	getOptionsForDynamicVariable,
	mergeUniqueStrings,
	settleVariableFetch,
} from './util';
import { VariableItemProps } from './VariableItem';
import { dynamicVariableSelectStrategy } from './variableSelectStrategy/dynamicVariableSelectStrategy';

import './DashboardVariableSelection.styles.scss';

type DynamicVariableInputProps = Pick<
	VariableItemProps,
	'variableData' | 'onValueUpdate' | 'existingVariables'
>;

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

	const allAvailableOptionStrings = useMemo(
		() => mergeUniqueStrings(optionsData, relatedValues),
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

	const {
		variableFetchCycleId,
		isVariableSettled,
		isVariableFetching,
		hasVariableFetchedOnce,
		isVariableWaitingForDependencies,
		variableDependencyWaitMessage,
	} = useVariableFetchState(variableData.name || '');

	const existingQuery = useMemo(
		() =>
			buildExistingDynamicVariableQuery(
				existingVariables,
				variableData.id,
				!!variableData.dynamicVariablesAttribute,
			),
		[existingVariables, variableData.id, variableData.dynamicVariablesAttribute],
	);

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

	const handleQuerySuccess = useCallback(
		(data: SuccessResponseV2<FieldValueResponse>): void => {
			const newNormalizedValues = data.data?.normalizedValues || [];
			const newRelatedValues = data.data?.relatedValues || [];

			if (!debouncedApiSearchText) {
				setOptionsData(newNormalizedValues);
				setIsComplete(data.data?.complete || false);
			}
			setFilteredOptionsData(newNormalizedValues);
			setRelatedValues(newRelatedValues);
			setOriginalRelatedValues(newRelatedValues);

			// Sync temp selection with latest API values when ALL is active and dropdown is open
			if (variableData.allSelected && isDropdownOpen) {
				const latestValues = mergeUniqueStrings(
					newNormalizedValues,
					newRelatedValues,
				);

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
				applyDefaultIfNeeded(
					mergeUniqueStrings(newNormalizedValues, newRelatedValues),
				);
			}

			settleVariableFetch(variableData.name, 'complete');
		},
		[
			debouncedApiSearchText,
			variableData.allSelected,
			variableData.name,
			isDropdownOpen,
			tempSelection,
			setTempSelection,
			applyDefaultIfNeeded,
		],
	);

	const handleQueryError = useCallback(
		(error: { message?: string } | null): void => {
			if (error) {
				setErrorMessage(extractErrorMessage(error));
				setIsRetryableError(checkIfRetryableError(error));
			}

			settleVariableFetch(variableData.name, 'failure');
		},
		[variableData.name],
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
			variableFetchCycleId,
		],
		{
			/*
			 * enabled if
			 * - we have dynamic variable source and attribute defined (ALWAYS)
			 * - AND
			 *   - we're either still fetching variable options
			 *   - OR
			 *   - if variable is in idle state and we have already fetched options for it
			 **/
			enabled:
				!!variableData.dynamicVariablesSource &&
				!!variableData.dynamicVariablesAttribute &&
				(isVariableFetching || (isVariableSettled && hasVariableFetchedOnce)),
			queryFn: ({ signal }) =>
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
					signal,
				),
			onSuccess: handleQuerySuccess,
			onError: handleQueryError,
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
			waiting={isVariableWaitingForDependencies}
			waitingMessage={variableDependencyWaitMessage}
		/>
	);
}

export default memo(DynamicVariableInput);

import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useVariableFetchState } from 'hooks/dashboard/useVariableFetchState';
import sortValues from 'lib/dashboardVariables/sortVariableValues';
import { isArray, isEmpty } from 'lodash-es';
import { AppState } from 'store/reducers';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	DASHBOARD_CACHE_TIME,
	DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
} from '../../../constants/queryCacheTime';
import { variablePropsToPayloadVariables } from '../utils';
import SelectVariableInput from './SelectVariableInput';
import { useDashboardVariableSelectHelper } from './useDashboardVariableSelectHelper';
import { areArraysEqual, settleVariableFetch } from './util';
import { VariableItemProps } from './VariableItem';
import { queryVariableSelectStrategy } from './variableSelectStrategy/queryVariableSelectStrategy';

type QueryVariableInputProps = Pick<
	VariableItemProps,
	'variableData' | 'existingVariables' | 'onValueUpdate'
>;

function QueryVariableInput({
	variableData,
	existingVariables,
	onValueUpdate,
}: QueryVariableInputProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);
	const [errorMessage, setErrorMessage] = useState<null | string>(null);

	const { maxTime, minTime, isAutoRefreshDisabled } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const {
		variableFetchCycleId,
		isVariableSettled,
		isVariableFetching,
		hasVariableFetchedOnce,
		isVariableWaitingForDependencies,
		variableDependencyWaitMessage,
	} = useVariableFetchState(variableData.name || '');

	const {
		tempSelection,
		setTempSelection,
		value,
		defaultValue,
		enableSelectAll,
		onChange,
		onDropdownVisibleChange,
		handleClear,
		getDefaultValue,
	} = useDashboardVariableSelectHelper({
		variableData,
		optionsData,
		onValueUpdate,
		strategy: queryVariableSelectStrategy,
	});

	const getOptions = useCallback(
		// eslint-disable-next-line sonarjs/cognitive-complexity
		(variablesRes: VariableResponseProps | null): void => {
			try {
				setErrorMessage(null);

				// This is just a check given the previously undefined typed name prop. Not significant
				// This will be changed when we change the schema
				// TODO: @AshwinBhatkal Perses
				if (!variableData.name) {
					return;
				}

				// if the response is not an array, premature return
				if (
					!variablesRes?.variableValues ||
					!Array.isArray(variablesRes?.variableValues)
				) {
					return;
				}

				const sortedNewOptions = sortValues(
					variablesRes.variableValues,
					variableData.sort,
				);
				const sortedOldOptions = sortValues(optionsData, variableData.sort);

				// if options are the same as before, no need to update state or check for selected value validity
				// ! selectedValue needs to be set in the first pass though, as options are initially empty array and we need to apply default if needed
				// Expecatation is that when oldOptions are not empty, then there is always some selectedValue
				if (areArraysEqual(sortedNewOptions, sortedOldOptions)) {
					return;
				}

				setOptionsData(sortedNewOptions);

				let isSelectedValueMissingInNewOptions = false;

				// Check if currently selected value(s) are present in the new options list
				if (isArray(variableData.selectedValue)) {
					isSelectedValueMissingInNewOptions = variableData.selectedValue.some(
						(val) => !sortedNewOptions.includes(val),
					);
				} else if (
					variableData.selectedValue &&
					!sortedNewOptions.includes(variableData.selectedValue)
				) {
					isSelectedValueMissingInNewOptions = true;
				}

				// If multi-select with ALL option enabled, and ALL is currently selected, we want to maintain that state and select all new options
				// This block does not depend on selected value because of ALL and also because we would only come here if options are different from the previous
				if (
					variableData.multiSelect &&
					variableData.showALLOption &&
					variableData.allSelected &&
					isSelectedValueMissingInNewOptions
				) {
					onValueUpdate(variableData.name, variableData.id, sortedNewOptions, true);

					// Update tempSelection to maintain ALL state when dropdown is open
					if (tempSelection !== undefined) {
						setTempSelection(sortedNewOptions.map((option) => option.toString()));
					}
					return;
				}

				const value = variableData.selectedValue;
				let allSelected = false;

				if (variableData.multiSelect) {
					const { selectedValue } = variableData;
					allSelected =
						sortedNewOptions.length > 0 &&
						Array.isArray(selectedValue) &&
						sortedNewOptions.every((option) => selectedValue.includes(option));
				}

				if (
					variableData.name &&
					variableData.id &&
					!isEmpty(variableData.selectedValue)
				) {
					onValueUpdate(variableData.name, variableData.id, value, allSelected);
				} else {
					const defaultValue = getDefaultValue(sortedNewOptions);
					if (defaultValue !== undefined) {
						onValueUpdate(
							variableData.name,
							variableData.id,
							defaultValue,
							allSelected,
						);
					}
				}
			} catch (e) {
				console.error(e);
			}
		},
		[
			variableData,
			optionsData,
			onValueUpdate,
			tempSelection,
			setTempSelection,
			getDefaultValue,
		],
	);

	const { isLoading, refetch } = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			variableData.name || '',
			`${minTime}`,
			`${maxTime}`,
			variableFetchCycleId,
		],
		{
			/*
			 * enabled if
			 *   - we're either still fetching variable options
			 *   - OR
			 *   - if variable is in idle state and we have already fetched options for it
			 **/
			enabled: isVariableFetching || (isVariableSettled && hasVariableFetchedOnce),
			queryFn: ({ signal }) =>
				dashboardVariablesQuery(
					{
						query: variableData.queryValue || '',
						variables: variablePropsToPayloadVariables(existingVariables),
					},
					signal,
				),
			refetchOnWindowFocus: false,
			cacheTime: isAutoRefreshDisabled
				? DASHBOARD_CACHE_TIME
				: DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			onSuccess: (response) => {
				getOptions(response.payload);
				settleVariableFetch(variableData.name, 'complete');
			},
			onError: (error: {
				details: {
					error: string;
				};
			}) => {
				const { details } = error;

				if (details.error) {
					let message = details.error;
					if ((details.error ?? '').toString().includes('Syntax error:')) {
						message =
							'Please make sure query is valid and dependent variables are selected';
					}
					setErrorMessage(message);
				}
				settleVariableFetch(variableData.name, 'failure');
			},
		},
	);

	const handleRetry = useCallback((): void => {
		setErrorMessage(null);
		refetch();
	}, [refetch]);

	const selectOptions = useMemo(
		() =>
			optionsData.map((option) => ({
				label: option.toString(),
				value: option.toString(),
			})),
		[optionsData],
	);

	return (
		<SelectVariableInput
			variableId={variableData.id}
			options={selectOptions}
			value={value}
			onChange={onChange}
			onDropdownVisibleChange={onDropdownVisibleChange}
			onClear={handleClear}
			enableSelectAll={enableSelectAll}
			defaultValue={defaultValue}
			isMultiSelect={variableData.multiSelect}
			// query variable specific, API related props
			loading={isLoading}
			errorMessage={errorMessage}
			onRetry={handleRetry}
			waiting={isVariableWaitingForDependencies}
			waitingMessage={variableDependencyWaitMessage}
		/>
	);
}

export default memo(QueryVariableInput);

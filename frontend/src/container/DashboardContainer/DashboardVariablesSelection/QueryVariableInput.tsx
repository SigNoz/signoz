import { memo, useCallback, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useVariableFetchState } from 'hooks/dashboard/useVariableFetchState';
import sortValues from 'lib/dashboardVariables/sortVariableValues';
import { isArray, isEmpty, isString } from 'lodash-es';
import { AppState } from 'store/reducers';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';
import { GlobalReducer } from 'types/reducer/globalTime';

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

	const {
		tempSelection,
		setTempSelection,
		value,
		defaultValue,
		enableSelectAll,
		onChange,
		onDropdownVisibleChange,
		handleClear,
		applyDefaultIfNeeded,
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

				if (
					variablesRes?.variableValues &&
					Array.isArray(variablesRes?.variableValues)
				) {
					const newOptionsData = sortValues(
						variablesRes?.variableValues,
						variableData.sort,
					);

					const oldOptionsData = sortValues(optionsData, variableData.sort) as never;

					if (!areArraysEqual(newOptionsData, oldOptionsData)) {
						let valueNotInList = false;

						if (isArray(variableData.selectedValue)) {
							variableData.selectedValue.forEach((val) => {
								if (!newOptionsData.includes(val)) {
									valueNotInList = true;
								}
							});
						} else if (
							isString(variableData.selectedValue) &&
							!newOptionsData.includes(variableData.selectedValue)
						) {
							valueNotInList = true;
						}

						if (variableData.name && (valueNotInList || variableData.allSelected)) {
							if (
								variableData.allSelected &&
								variableData.multiSelect &&
								variableData.showALLOption
							) {
								if (
									variableData.name &&
									variableData.id &&
									!isEmpty(variableData.selectedValue)
								) {
									onValueUpdate(
										variableData.name,
										variableData.id,
										newOptionsData,
										true,
									);
								}

								// Update tempSelection to maintain ALL state when dropdown is open
								if (tempSelection !== undefined) {
									setTempSelection(newOptionsData.map((option) => option.toString()));
								}
							} else {
								const value = variableData.selectedValue;
								let allSelected = false;

								if (variableData.multiSelect) {
									const { selectedValue } = variableData;
									allSelected =
										newOptionsData.length > 0 &&
										Array.isArray(selectedValue) &&
										newOptionsData.every((option) => selectedValue.includes(option));
								}

								if (
									variableData.name &&
									variableData.id &&
									!isEmpty(variableData.selectedValue)
								) {
									onValueUpdate(variableData.name, variableData.id, value, allSelected);
								}
							}
						}

						setOptionsData(newOptionsData);
						// Apply default if no value is selected (e.g., new variable, first load)
						applyDefaultIfNeeded(newOptionsData);
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
			applyDefaultIfNeeded,
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

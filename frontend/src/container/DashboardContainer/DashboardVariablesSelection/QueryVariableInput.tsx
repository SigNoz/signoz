import { memo, useCallback, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { isArray, isString } from 'lodash-es';
import { IDependencyData } from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';
import { GlobalReducer } from 'types/reducer/globalTime';

import { variablePropsToPayloadVariables } from '../utils';
import SelectVariableInput from './SelectVariableInput';
import { useDashboardVariableSelectHelper } from './useDashboardVariableSelectHelper';
import { areArraysEqual, checkAPIInvocation } from './util';

interface QueryVariableInputProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
	variablesToGetUpdated: string[];
	setVariablesToGetUpdated: React.Dispatch<React.SetStateAction<string[]>>;
	dependencyData: IDependencyData | null;
}

function QueryVariableInput({
	variableData,
	existingVariables,
	variablesToGetUpdated,
	setVariablesToGetUpdated,
	dependencyData,
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
		tempSelection,
		setTempSelection,
		value,
		defaultValue,
		enableSelectAll,
		onChange,
		onDropdownVisibleChange,
		handleClear,
	} = useDashboardVariableSelectHelper({
		variableData,
		optionsData,
		onValueUpdate,
	});

	const validVariableUpdate = (): boolean => {
		if (!variableData.name) {
			return false;
		}
		return Boolean(
			variablesToGetUpdated.length &&
				variablesToGetUpdated[0] === variableData.name,
		);
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const getOptions = (variablesRes: VariableResponseProps | null): void => {
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

					// variablesData.allSelected is added for the case where on change of options we need to update the
					// local storage
					if (
						variableData.name &&
						(validVariableUpdate() || valueNotInList || variableData.allSelected)
					) {
						if (
							variableData.allSelected &&
							variableData.multiSelect &&
							variableData.showALLOption
						) {
							onValueUpdate(variableData.name, variableData.id, newOptionsData, true);

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

							if (variableData.name && variableData.id) {
								onValueUpdate(variableData.name, variableData.id, value, allSelected);
							}
						}
					}

					setOptionsData(newOptionsData);
				} else {
					setVariablesToGetUpdated((prev) =>
						prev.filter((name) => name !== variableData.name),
					);
				}
			}
		} catch (e) {
			console.error(e);
		}
	};

	const { isLoading, refetch } = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			variableData.name || '',
			`${minTime}`,
			`${maxTime}`,
			JSON.stringify(dependencyData?.order),
		],
		{
			enabled:
				variableData &&
				variableData.type === 'QUERY' &&
				checkAPIInvocation(
					variablesToGetUpdated,
					variableData,
					dependencyData?.parentDependencyGraph,
				),
			queryFn: () =>
				dashboardVariablesQuery({
					query: variableData.queryValue || '',
					variables: variablePropsToPayloadVariables(existingVariables),
				}),
			refetchOnWindowFocus: false,
			onSuccess: (response) => {
				getOptions(response.payload);
				setVariablesToGetUpdated((prev) =>
					prev.filter((v) => v !== variableData.name),
				);
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
				setVariablesToGetUpdated((prev) =>
					prev.filter((v) => v !== variableData.name),
				);
			},
		},
	);

	const handleRetry = useCallback((): void => {
		setErrorMessage(null);
		refetch();
	}, [refetch]);

	return (
		<SelectVariableInput
			variableId={variableData.id}
			options={optionsData}
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
		/>
	);
}

export default memo(QueryVariableInput);

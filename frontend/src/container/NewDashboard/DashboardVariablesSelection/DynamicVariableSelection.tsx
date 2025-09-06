/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-nested-ternary */
import './DashboardVariableSelection.styles.scss';

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
import { popupContainer } from 'utils/selectPopupContainer';

import { ALL_SELECT_VALUE } from '../utils';
import { SelectItemStyle } from './styles';
import { areArraysEqual } from './util';
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

	const [isComplete, setIsComplete] = useState<boolean>(false);

	const [filteredOptionsData, setFilteredOptionsData] = useState<
		(string | number | boolean)[]
	>([]);

	const [tempSelection, setTempSelection] = useState<
		string | string[] | undefined
	>(undefined);

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

	const { isLoading, refetch } = useQuery(
		[
			REACT_QUERY_KEY.DASHBOARD_BY_ID,
			variableData.name || `variable_${variableData.id}`,
			dynamicVariablesKey,
			minTime,
			maxTime,
		],
		{
			enabled: variableData.type === 'DYNAMIC',
			queryFn: () =>
				getFieldValues(
					variableData.dynamicVariablesSource?.toLowerCase() === 'all sources'
						? undefined
						: (variableData.dynamicVariablesSource?.toLowerCase() as
								| 'traces'
								| 'logs'
								| 'metrics'),
					variableData.dynamicVariablesAttribute,
					debouncedApiSearchText,
					minTime,
					maxTime,
				),
			onSuccess: (data) => {
				setOptionsData(data.payload?.normalizedValues || []);
				setIsComplete(data.payload?.complete || false);
				setFilteredOptionsData(data.payload?.normalizedValues || []);
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
					onValueUpdate(variableData.name, variableData.id, optionsData, true);
				} else {
					onValueUpdate(
						variableData.name,
						variableData.id,
						value,
						optionsData.every((v) => value.includes(v.toString())),
						Array.isArray(value) &&
							!value.every((v) => optionsData.includes(v.toString())),
					);
				}
			}
		},
		[variableData, onValueUpdate, optionsData],
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

	const handleSearch = useCallback(
		(text: string) => {
			if (isComplete) {
				if (!text) {
					setFilteredOptionsData(optionsData);
					return;
				}

				const localFilteredOptionsData: (string | number | boolean)[] = [];
				optionsData.forEach((option) => {
					if (option.toString().toLowerCase().includes(text.toLowerCase())) {
						localFilteredOptionsData.push(option);
					}
				});
				setFilteredOptionsData(localFilteredOptionsData);
			} else {
				setApiSearchText(text);
			}
		},
		[isComplete, optionsData],
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
	const handleTempChange = (inputValue: string | string[]): void => {
		// Store the selection in temporary state while dropdown is open
		const value = variableData.multiSelect && !inputValue ? [] : inputValue;
		setTempSelection(value);
	};

	// Handle dropdown visibility changes
	const handleDropdownVisibleChange = (visible: boolean): void => {
		// Initialize temp selection when opening dropdown
		if (visible) {
			if (isUndefined(tempSelection) && selectValue === ALL_SELECT_VALUE) {
				// set all options from the optionsData and the selectedValue, make sure to remove duplicates
				const allOptions = [
					...new Set([
						...optionsData.map((option) => option.toString()),
						...(variableData.selectedValue
							? Array.isArray(variableData.selectedValue)
								? variableData.selectedValue.map((v) => v.toString())
								: [variableData.selectedValue.toString()]
							: []),
					]),
				];
				setTempSelection(allOptions);
			} else {
				setTempSelection(getSelectValue(variableData.selectedValue, variableData));
			}
		}
		// Apply changes when closing dropdown
		else if (!visible && tempSelection !== undefined) {
			// Call handleChange with the temporarily stored selection
			handleChange(tempSelection);
			setTempSelection(undefined);
		}
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const finalSelectedValues = useMemo(() => {
		if (variableData.multiSelect) {
			let value = tempSelection || selectedValue;
			if (isEmpty(value)) {
				if (variableData.showALLOption) {
					if (variableData.defaultValue) {
						value = variableData.defaultValue;
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
		selectedValue,
		tempSelection,
		optionsData,
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
			</Typography.Text>
			<div className="variable-value">
				{variableData.multiSelect ? (
					<CustomMultiSelect
						key={
							selectValue && Array.isArray(selectValue)
								? selectValue.join(' ')
								: selectValue || variableData.id
						}
						options={filteredOptionsData.map((option) => ({
							label: option.toString(),
							value: option.toString(),
						}))}
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
						maxTagPlaceholder={(omittedValues): JSX.Element => (
							<Tooltip title={omittedValues.map(({ value }) => value).join(', ')}>
								<span>+ {omittedValues.length} </span>
							</Tooltip>
						)}
						onClear={(): void => {
							handleChange([]);
						}}
						enableAllSelection={enableSelectAll}
						maxTagTextLength={30}
						onSearch={handleSearch}
						onRetry={(): void => {
							refetch();
						}}
						showIncompleteDataMessage={!isComplete && filteredOptionsData.length > 0}
					/>
				) : (
					<CustomSelect
						key={
							selectValue && Array.isArray(selectValue)
								? selectValue.join(' ')
								: selectValue || variableData.id
						}
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
						options={filteredOptionsData.map((option) => ({
							label: option.toString(),
							value: option.toString(),
						}))}
						value={selectValue}
						defaultValue={variableData.defaultValue}
						errorMessage={errorMessage}
						onSearch={handleSearch}
						onRetry={(): void => {
							refetch();
						}}
						showIncompleteDataMessage={!isComplete && filteredOptionsData.length > 0}
					/>
				)}
			</div>
		</div>
	);
}

export default DynamicVariableSelection;

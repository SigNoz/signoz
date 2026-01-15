/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-nested-ternary */
import './DashboardVariableSelection.styles.scss';

import { orange } from '@ant-design/colors';
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { Input, Popover, Tooltip, Typography } from 'antd';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { debounce, isArray, isEmpty, isString } from 'lodash-es';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';
import { GlobalReducer } from 'types/reducer/globalTime';
import { popupContainer } from 'utils/selectPopupContainer';

import { ALL_SELECT_VALUE, variablePropsToPayloadVariables } from '../utils';
import { SelectItemStyle } from './styles';
import { areArraysEqual, checkAPIInvocation, IDependencyData } from './util';

interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string,
		id: string,
		arg1: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
	variablesToGetUpdated: string[];
	setVariablesToGetUpdated: React.Dispatch<React.SetStateAction<string[]>>;
	dependencyData: IDependencyData | null;
}

export const getSelectValue = (
	selectedValue: IDashboardVariable['selectedValue'],
	variableData: IDashboardVariable,
): string | string[] | undefined => {
	if (Array.isArray(selectedValue)) {
		if (!variableData.multiSelect && selectedValue.length === 1) {
			return selectedValue[0]?.toString();
		}
		return selectedValue.map((item) => item.toString());
	}
	return selectedValue?.toString();
};

// eslint-disable-next-line sonarjs/cognitive-complexity
function VariableItem({
	variableData,
	existingVariables,
	onValueUpdate,
	variablesToGetUpdated,
	setVariablesToGetUpdated,
	dependencyData,
}: VariableItemProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);
	const [tempSelection, setTempSelection] = useState<
		string | string[] | undefined
	>(undefined);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const validVariableUpdate = (): boolean => {
		if (!variableData.name) {
			return false;
		}

		// variableData.name is present as the top element or next in the queue - variablesToGetUpdated
		return Boolean(
			variablesToGetUpdated.length &&
				variablesToGetUpdated[0] === variableData.name,
		);
	};

	const [errorMessage, setErrorMessage] = useState<null | string>(null);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const getOptions = (variablesRes: VariableResponseProps | null): void => {
		if (variablesRes && variableData.type === 'QUERY') {
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
						/* eslint-disable no-useless-escape */

						let valueNotInList = false;

						if (isArray(variableData.selectedValue)) {
							variableData.selectedValue.forEach((val) => {
								const isUsed = newOptionsData.includes(val);

								if (!isUsed) {
									valueNotInList = true;
								}
							});
						} else if (isString(variableData.selectedValue)) {
							const isUsed = newOptionsData.includes(variableData.selectedValue);

							if (!isUsed) {
								valueNotInList = true;
							}
						}

						// variablesData.allSelected is added for the case where on change of options we need to update the
						// local storage
						if (
							variableData.type === 'QUERY' &&
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

								if (variableData && variableData?.name && variableData?.id) {
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
		} else if (variableData.type === 'CUSTOM') {
			const optionsData = sortValues(
				commaValuesParser(variableData.customValue || ''),
				variableData.sort,
			) as never;

			setOptionsData(optionsData);
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
				// Check if ALL is effectively selected by comparing with available options
				const isAllSelected =
					Array.isArray(value) &&
					value.length > 0 &&
					optionsData.every((option) => value.includes(option.toString()));

				if (isAllSelected && variableData.showALLOption) {
					// For ALL selection, pass null to avoid storing values
					onValueUpdate(variableData.name, variableData.id, optionsData, true);
				} else {
					onValueUpdate(variableData.name, variableData.id, value, false);
				}
			}
		},
		[
			variableData.multiSelect,
			variableData.selectedValue,
			variableData.name,
			variableData.id,
			onValueUpdate,
			optionsData,
			variableData.showALLOption,
		],
	);

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
			setTempSelection(getSelectValue(variableData.selectedValue, variableData));
		}
		// Apply changes when closing dropdown
		else if (!visible && tempSelection !== undefined) {
			// Call handleChange with the temporarily stored selection
			handleChange(tempSelection);
			setTempSelection(undefined);
		}
	};

	// do not debounce the above function as we do not need debounce in select variables
	const debouncedHandleChange = debounce(handleChange, 500);

	const { selectedValue } = variableData;
	const selectedValueStringified = useMemo(
		() => getSelectValue(selectedValue, variableData),
		[selectedValue, variableData],
	);

	const enableSelectAll = variableData.multiSelect && variableData.showALLOption;

	const selectValue =
		variableData.allSelected && enableSelectAll
			? 'ALL'
			: selectedValueStringified;

	// Apply default value on first render if no selection exists
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

	useEffect(() => {
		// Fetch options for CUSTOM Type
		if (variableData.type === 'CUSTOM') {
			getOptions(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variableData.type, variableData.customValue]);

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
				{variableData.type === 'TEXTBOX' ? (
					<Input
						placeholder="Enter value"
						bordered={false}
						key={variableData.selectedValue?.toString()}
						defaultValue={variableData.selectedValue?.toString()}
						onChange={(e): void => {
							debouncedHandleChange(e.target.value || '');
						}}
						style={{
							width:
								50 + ((variableData.selectedValue?.toString()?.length || 0) * 7 || 50),
						}}
					/>
				) : (
					optionsData &&
					(variableData.multiSelect ? (
						<CustomMultiSelect
							key={
								selectValue && Array.isArray(selectValue)
									? selectValue.join(' ')
									: selectValue || variableData.id
							}
							options={optionsData.map((option) => ({
								label: option.toString(),
								value: option.toString(),
							}))}
							defaultValue={variableData.defaultValue || selectValue}
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
							value={tempSelection || selectValue}
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
							allowClear={selectValue !== ALL_SELECT_VALUE && selectValue !== 'ALL'}
							onRetry={(): void => {
								setErrorMessage(null);
								refetch();
							}}
						/>
					) : (
						<CustomSelect
							key={
								selectValue && Array.isArray(selectValue)
									? selectValue.join(' ')
									: selectValue || variableData.id
							}
							defaultValue={variableData.defaultValue || selectValue}
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
							options={optionsData.map((option) => ({
								label: option.toString(),
								value: option.toString(),
							}))}
							value={selectValue}
							errorMessage={errorMessage}
							onRetry={(): void => {
								setErrorMessage(null);
								refetch();
							}}
						/>
					))
				)}
				{variableData.type !== 'TEXTBOX' && errorMessage && (
					<span style={{ margin: '0 0.5rem' }}>
						<Popover
							placement="top"
							content={<Typography>{errorMessage}</Typography>}
						>
							<WarningOutlined style={{ color: orange[5] }} />
						</Popover>
					</span>
				)}
			</div>
		</div>
	);
}

export default memo(VariableItem);

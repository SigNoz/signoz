import './DashboardVariableSelection.styles.scss';

import { Tooltip, Typography } from 'antd';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { CustomMultiSelect, CustomSelect } from 'components/NewSelect';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { popupContainer } from 'utils/selectPopupContainer';

import { SelectItemStyle } from './styles';
import { areArraysEqual } from './util';
import { getSelectValue } from './VariableItem';

interface DynamicVariableSelectionProps {
	variableData: IDashboardVariable;
	onValueUpdate: (
		name: string,
		id: string,
		arg1: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
}

const ALL_SELECT_VALUE = '__ALL__';

function DynamicVariableSelection({
	variableData,
	onValueUpdate,
}: DynamicVariableSelectionProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);

	const [errorMessage, setErrorMessage] = useState<null | string>(null);

	const [tempSelection, setTempSelection] = useState<
		string | string[] | undefined
	>(undefined);

	const { isLoading } = useQuery(
		[REACT_QUERY_KEY.DASHBOARD_BY_ID, variableData.name || ''],
		{
			enabled: variableData.type === 'DYNAMIC',
			queryFn: () =>
				getFieldValues(
					variableData.dynamicVariablesSource as 'traces' | 'logs' | 'metrics',
					variableData.dynamicVariablesAttribute,
				),
			onSuccess: (data) => {
				setOptionsData(data.payload?.values?.stringValues || []);
			},
			onError: (error: {
				details: {
					error: string;
				};
			}) => {
				const { details } = error;

				if (details.error) {
					let message = details.error;
					if (details.error.includes('Syntax error:')) {
						message =
							'Please make sure query is valid and dependent variables are selected';
					}
					setErrorMessage(message);
				}
			},
		},
	);

	const handleChange = (inputValue: string | string[]): void => {
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
				onValueUpdate(variableData.name, variableData.id, value, false);
			}
		}
	};

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
						options={optionsData.map((option) => ({
							label: option.toString(),
							value: option.toString(),
						}))}
						defaultValue={selectValue}
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
						maxTagCount={4}
						getPopupContainer={popupContainer}
						allowClear
						value={tempSelection || selectValue}
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
						options={optionsData.map((option) => ({
							label: option.toString(),
							value: option.toString(),
						}))}
						value={selectValue}
						defaultValue={variableData.defaultValue}
						errorMessage={errorMessage}
					/>
				)}
			</div>
		</div>
	);
}

export default DynamicVariableSelection;

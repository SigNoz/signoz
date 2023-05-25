import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Input, Popover, Select, Typography } from 'antd';
import query from 'api/dashboard/variables/query';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { memo, useCallback, useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { variablePropsToPayloadVariables } from '../utils';
import { SelectItemStyle, VariableContainer, VariableName } from './styles';
import { areArraysEqual } from './util';

const ALL_SELECT_VALUE = '__ALL__';

interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string,
		arg1: IDashboardVariable['selectedValue'],
	) => void;
	onAllSelectedUpdate: (name: string, arg1: boolean) => void;
	lastUpdatedVar: string;
}
function VariableItem({
	variableData,
	existingVariables,
	onValueUpdate,
	onAllSelectedUpdate,
	lastUpdatedVar,
}: VariableItemProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [errorMessage, setErrorMessage] = useState<null | string>(null);

	/* eslint-disable sonarjs/cognitive-complexity */
	const getOptions = useCallback(async (): Promise<void> => {
		if (variableData.type === 'QUERY') {
			try {
				setErrorMessage(null);
				setIsLoading(true);

				const response = await query({
					query: variableData.queryValue || '',
					variables: variablePropsToPayloadVariables(existingVariables),
				});

				setIsLoading(false);
				if (response.error) {
					let message = response.error;
					if (response.error.includes('Syntax error:')) {
						message =
							'Please make sure query is valid and dependent variables are selected';
					}
					setErrorMessage(message);
					return;
				}
				if (response.payload?.variableValues) {
					const newOptionsData = sortValues(
						response.payload?.variableValues,
						variableData.sort,
					);
					// Since there is a chance of a variable being dependent on other
					// variables, we need to check if the optionsData has changed
					// If it has changed, we need to update the dependent variable
					// So we compare the new optionsData with the old optionsData
					const oldOptionsData = sortValues(optionsData, variableData.sort) as never;
					if (!areArraysEqual(newOptionsData, oldOptionsData)) {
						/* eslint-disable no-useless-escape */
						const re = new RegExp(`\\{\\{\\s*?\\.${lastUpdatedVar}\\s*?\\}\\}`); // regex for `{{.var}}`
						// If the variable is dependent on the last updated variable
						// and contains the last updated variable in its query (of the form `{{.var}}`)
						// then we need to update the value of the variable
						const queryValue = variableData.queryValue || '';
						const dependVarReMatch = queryValue.match(re);
						if (
							variableData.type === 'QUERY' &&
							dependVarReMatch !== null &&
							dependVarReMatch.length > 0
						) {
							let value = variableData.selectedValue;
							let allSelected = false;
							// The default value for multi-select is ALL and first value for
							// single select
							if (variableData.multiSelect) {
								value = newOptionsData;
								allSelected = true;
							} else {
								[value] = newOptionsData;
							}
							if (variableData.name) {
								onValueUpdate(variableData.name, value);
								onAllSelectedUpdate(variableData.name, allSelected);
							}
						}
						setOptionsData(newOptionsData);
					}
				}
			} catch (e) {
				console.error(e);
			}
		} else if (variableData.type === 'CUSTOM') {
			setOptionsData(
				sortValues(
					commaValuesParser(variableData.customValue || ''),
					variableData.sort,
				) as never,
			);
		}
	}, [
		variableData,
		existingVariables,
		onValueUpdate,
		onAllSelectedUpdate,
		optionsData,
		lastUpdatedVar,
	]);

	useEffect(() => {
		getOptions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variableData, existingVariables]);

	const handleChange = (value: string | string[]): void => {
		if (variableData.name)
			if (
				value === ALL_SELECT_VALUE ||
				(Array.isArray(value) && value.includes(ALL_SELECT_VALUE)) ||
				(Array.isArray(value) && value.length === 0)
			) {
				onValueUpdate(variableData.name, optionsData);
				onAllSelectedUpdate(variableData.name, true);
			} else {
				onValueUpdate(variableData.name, value);
				onAllSelectedUpdate(variableData.name, false);
			}
	};

	const selectValue = variableData.allSelected
		? 'ALL'
		: variableData.selectedValue?.toString() || '';
	const mode =
		variableData.multiSelect && !variableData.allSelected
			? 'multiple'
			: undefined;
	const enableSelectAll = variableData.multiSelect && variableData.showALLOption;
	return (
		<VariableContainer>
			<VariableName>${variableData.name}</VariableName>
			{variableData.type === 'TEXTBOX' ? (
				<Input
					placeholder="Enter value"
					bordered={false}
					value={variableData.selectedValue?.toString()}
					onChange={(e): void => {
						handleChange(e.target.value || '');
					}}
					style={{
						width:
							50 + ((variableData.selectedValue?.toString()?.length || 0) * 7 || 50),
					}}
				/>
			) : (
				!errorMessage && (
					<Select
						value={selectValue}
						onChange={handleChange}
						bordered={false}
						placeholder="Select value"
						mode={mode}
						dropdownMatchSelectWidth={false}
						style={SelectItemStyle}
						loading={isLoading}
						showArrow
						data-testid="variable-select"
					>
						{enableSelectAll && (
							<Select.Option data-testid="option-ALL" value={ALL_SELECT_VALUE}>
								ALL
							</Select.Option>
						)}
						{optionsData.map((option) => (
							<Select.Option
								data-testid={`option-${option}`}
								key={option.toString()}
								value={option}
							>
								{option.toString()}
							</Select.Option>
						))}
					</Select>
				)
			)}
			{errorMessage && (
				<span style={{ margin: '0 0.5rem' }}>
					<Popover placement="top" content={<Typography>{errorMessage}</Typography>}>
						<WarningOutlined style={{ color: orange[5] }} />
					</Popover>
				</span>
			)}
		</VariableContainer>
	);
}

export default memo(VariableItem);

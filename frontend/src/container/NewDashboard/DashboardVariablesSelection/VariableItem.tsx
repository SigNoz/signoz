/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-useless-escape */

import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Input, Popover, Select, Typography } from 'antd';
import query from 'api/dashboard/variables/query';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { map } from 'lodash-es';
import React, { useCallback, useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { VariableContainer, VariableName } from './styles';

const { Option } = Select;

const ALL_SELECT_VALUE = '__ALL__';

const equalsCheck = (
	a: string[] | number[],
	b: string[] | number[],
): boolean => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onValueUpdate: (
		name: string | undefined,
		arg1: string | string[] | null | undefined,
	) => void;
	onAllSelectedUpdate: (name: string | undefined, arg1: boolean) => void;
	lastUpdatedVar: string;
}
function VariableItem({
	variableData,
	existingVariables,
	onValueUpdate,
	onAllSelectedUpdate,
	lastUpdatedVar,
}: VariableItemProps): JSX.Element {
	const [optionsData, setOptionsData] = useState([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [errorMessage, setErrorMessage] = useState<null | string>(null);
	const getOptions = useCallback(async (): Promise<void> => {
		if (variableData.type === 'QUERY') {
			try {
				setErrorMessage(null);
				setIsLoading(true);

				const response = await query({
					query: variableData.queryValue || '',
					variables: existingVariables,
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
					) as never;
					const oldOptionsData = sortValues(optionsData, variableData.sort) as never;
					if (!equalsCheck(newOptionsData, oldOptionsData)) {
						// If a variable is dependent on the current variable, update the dependent variable
						const re = new RegExp(`\\{\\{\\s*?\\.${lastUpdatedVar}\\s*?\\}\\}`);
						console.log(re, variableData.queryValue?.match(re));
						if (
							variableData.type === 'QUERY' &&
							variableData.queryValue?.match(re)?.length > 0
						) {
							let value = variableData.selectedValue;
							if (variableData.multiSelect) {
								if (variableData.showALLOption) {
									value = ALL_SELECT_VALUE;
								} else {
									value = newOptionsData;
								}
							} else {
								[value] = newOptionsData;
							}
							onValueUpdate(variableData.name, value);
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
		optionsData,
		lastUpdatedVar,
	]);

	useEffect(() => {
		getOptions();
	}, [getOptions]);

	const handleChange = (value: string | string[]): void => {
		if (
			value === ALL_SELECT_VALUE ||
			(Array.isArray(value) && value.includes(ALL_SELECT_VALUE))
		) {
			onValueUpdate(variableData.name, optionsData);
			onAllSelectedUpdate(variableData.name, true);
		} else {
			onValueUpdate(variableData.name, value);
			onAllSelectedUpdate(variableData.name, false);
		}
	};
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
						width: 50 + ((variableData.selectedValue?.length || 0) * 7 || 50),
					}}
				/>
			) : (
				!errorMessage && (
					<Select
						value={variableData.allSelected ? 'ALL' : variableData.selectedValue}
						onChange={handleChange}
						bordered={false}
						placeholder="Select value"
						mode={
							(variableData.multiSelect && !variableData.allSelected
								? 'multiple'
								: null) as never
						}
						dropdownMatchSelectWidth={false}
						style={{
							minWidth: 120,
							fontSize: '0.8rem',
						}}
						loading={isLoading}
						showArrow
					>
						{variableData.multiSelect && variableData.showALLOption && (
							<Option value={ALL_SELECT_VALUE}>ALL</Option>
						)}
						{map(optionsData, (option) => {
							return <Option value={option}>{(option as string).toString()}</Option>;
						})}
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

export default VariableItem;

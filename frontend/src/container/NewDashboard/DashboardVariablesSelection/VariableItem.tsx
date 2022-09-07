import { Input, Select, Typography } from 'antd';
import query from 'api/dashboard/variables/query';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { map } from 'lodash-es';
import React, { useCallback, useEffect, useState } from 'react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { VariableContainer, VariableName } from './styles';

const { Option } = Select;

const ALL_SELECT_VALUE = '__ALL__';

interface VariableItemProps {
	variableData: IDashboardVariable;
}
function VariableItem({
	variableData,
	onValueUpdate,
	onAllSelectedUpdate,
}: VariableItemProps) {
	const [optionsData, setOptionsData] = useState([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const getOptions = useCallback(async (): Promise<void> => {
		if (variableData.type === 'QUERY') {
			try {
				const response = await query({
					query: variableData.queryValue,
				});
				if (response.payload?.variableValues)
					setOptionsData(
						sortValues(response.payload?.variableValues, variableData.sort),
					);
			} catch (e) {}
		} else if (variableData.type === 'CUSTOM') {
			setOptionsData(
				sortValues(commaValuesParser(variableData.customValue), variableData.sort),
			);
		}
	}, [variableData.customValue, variableData.queryValue, variableData.type]);

	useEffect(() => {
		getOptions();
	}, []);

	const handleChange = (value) => {
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
					onChange={(e) => {
						handleChange(e.target.value || '');
					}}
					style={{
						width: 50 + (variableData.selectedValue?.length * 7 || 50),
					}}
				/>
			) : (
				<Select
					value={variableData.allSelected ? 'ALL' : variableData.selectedValue}
					onChange={handleChange}
					bordered={false}
					placeholder="Select value"
					mode={
						variableData.multiSelect && !variableData.allSelected ? 'multiple' : null
					}
					dropdownMatchSelectWidth={false}
					style={{
						minWidth: 120,
						fontSize: '0.8rem',
					}}
					loading={isLoading}
					// options={optionsData.map((option) => ({
					// 	value: option,
					// 	label: option.toString(),
					// }))}
					showArrow
				>
					{variableData.multiSelect && variableData.showALLOption && (
						<Option value={ALL_SELECT_VALUE}>ALL</Option>
					)}
					{map(optionsData, (option) => {
						return <Option value={option}>{option.toString()}</Option>;
					})}
				</Select>
			)}
		</VariableContainer>
	);
}

export default VariableItem;

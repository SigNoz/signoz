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

interface VariableItemProps {
	variableData: IDashboardVariable;
	onValueUpdate: (name: string | undefined, arg1: string | string[]) => void;
	onAllSelectedUpdate: (name: string | undefined, arg1: boolean) => void;
}
function VariableItem({
	variableData,
	onValueUpdate,
	onAllSelectedUpdate,
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
				});

				setIsLoading(false);
				if (response.error) {
					setErrorMessage(response.error);
					return;
				}
				if (response.payload?.variableValues)
					setOptionsData(
						sortValues(response.payload?.variableValues, variableData.sort) as never,
					);
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
		variableData.customValue,
		variableData.queryValue,
		variableData.sort,
		variableData.type,
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

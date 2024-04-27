import './DashboardVariableSelection.styles.scss';

import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Input, Popover, Select, Typography } from 'antd';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { debounce } from 'lodash-es';
import map from 'lodash-es/map';
import { memo, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';
import { popupContainer } from 'utils/selectPopupContainer';

import { variablePropsToPayloadVariables } from '../utils';
import { SelectItemStyle } from './styles';
import { areArraysEqual } from './util';

const ALL_SELECT_VALUE = '__ALL__';

const variableRegexPattern = /\{\{\s*?\.([^\s}]+)\s*?\}\}/g;

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
}

const getSelectValue = (
	selectedValue: IDashboardVariable['selectedValue'],
): string | string[] => {
	if (Array.isArray(selectedValue)) {
		return selectedValue.map((item) => item.toString());
	}
	return selectedValue?.toString() || '';
};

// eslint-disable-next-line sonarjs/cognitive-complexity
function VariableItem({
	variableData,
	existingVariables,
	onValueUpdate,
	variablesToGetUpdated,
}: VariableItemProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);

	const [errorMessage, setErrorMessage] = useState<null | string>(null);

	const getDependentVariables = (queryValue: string): string[] => {
		const matches = queryValue.match(variableRegexPattern);

		// Extract variable names from the matches array without {{ . }}
		return matches
			? matches.map((match) => match.replace(variableRegexPattern, '$1'))
			: [];
	};

	const getQueryKey = (variableData: IDashboardVariable): string[] => {
		let dependentVariablesStr = '';

		const dependentVariables = getDependentVariables(
			variableData.queryValue || '',
		);

		const variableName = variableData.name || '';

		dependentVariables?.forEach((element) => {
			const [, variable] =
				Object.entries(existingVariables).find(
					([, value]) => value.name === element,
				) || [];

			dependentVariablesStr += `${element}${variable?.selectedValue}`;
		});

		const variableKey = dependentVariablesStr.replace(/\s/g, '');

		return [REACT_QUERY_KEY.DASHBOARD_BY_ID, variableName, variableKey];
	};

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
						if (
							variableData.type === 'QUERY' &&
							variableData.name &&
							variablesToGetUpdated.includes(variableData.name)
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

							if (variableData && variableData?.name && variableData?.id) {
								onValueUpdate(variableData.name, variableData.id, value, allSelected);
							}
						}

						setOptionsData(newOptionsData);
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

	const { isLoading } = useQuery(getQueryKey(variableData), {
		enabled: variableData && variableData.type === 'QUERY',
		queryFn: () =>
			dashboardVariablesQuery({
				query: variableData.queryValue || '',
				variables: variablePropsToPayloadVariables(existingVariables),
			}),
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			getOptions(response.payload);
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
	});

	const handleChange = (value: string | string[]): void => {
		if (variableData.name)
			if (
				value === ALL_SELECT_VALUE ||
				(Array.isArray(value) && value.includes(ALL_SELECT_VALUE)) ||
				(Array.isArray(value) && value.length === 0)
			) {
				onValueUpdate(variableData.name, variableData.id, optionsData, true);
			} else {
				onValueUpdate(variableData.name, variableData.id, value, false);
			}
	};

	// do not debounce the above function as we do not need debounce in select variables
	const debouncedHandleChange = debounce(handleChange, 500);

	const { selectedValue } = variableData;
	const selectedValueStringified = useMemo(() => getSelectValue(selectedValue), [
		selectedValue,
	]);

	const selectValue = variableData.allSelected
		? 'ALL'
		: selectedValueStringified;

	const mode =
		variableData.multiSelect && !variableData.allSelected
			? 'multiple'
			: undefined;
	const enableSelectAll = variableData.multiSelect && variableData.showALLOption;

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
					!errorMessage &&
					optionsData && (
						<Select
							key={
								selectValue && Array.isArray(selectValue)
									? selectValue.join(' ')
									: selectValue || variableData.id
							}
							defaultValue={selectValue}
							onChange={handleChange}
							bordered={false}
							placeholder="Select value"
							placement="bottomRight"
							mode={mode}
							dropdownMatchSelectWidth={false}
							style={SelectItemStyle}
							loading={isLoading}
							showSearch
							data-testid="variable-select"
							className="variable-select"
							getPopupContainer={popupContainer}
						>
							{enableSelectAll && (
								<Select.Option data-testid="option-ALL" value={ALL_SELECT_VALUE}>
									ALL
								</Select.Option>
							)}
							{map(optionsData, (option) => (
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

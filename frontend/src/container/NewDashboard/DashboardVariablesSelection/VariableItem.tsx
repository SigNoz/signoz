import './DashboardVariableSelection.styles.scss';

import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import { Input, Popover, Select, Typography } from 'antd';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useDebounce from 'hooks/useDebounce';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import map from 'lodash-es/map';
import { memo, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';

import { variablePropsToPayloadVariables } from '../utils';
import { SelectItemStyle, VariableContainer, VariableValue } from './styles';
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
	lastUpdatedVar: string;
}

const getSelectValue = (
	selectedValue: IDashboardVariable['selectedValue'],
): string | string[] => {
	if (Array.isArray(selectedValue)) {
		return selectedValue.map((item) => item.toString());
	}
	return selectedValue?.toString() || '';
};

function VariableItem({
	variableData,
	existingVariables,
	onValueUpdate,
	lastUpdatedVar,
}: VariableItemProps): JSX.Element {
	const [optionsData, setOptionsData] = useState<(string | number | boolean)[]>(
		[],
	);

	const [variableValue, setVaribleValue] = useState(
		variableData?.selectedValue?.toString() || '',
	);

	const debouncedVariableValue = useDebounce(variableValue, 500);

	const [errorMessage, setErrorMessage] = useState<null | string>(null);

	useEffect(() => {
		const { selectedValue } = variableData;

		if (selectedValue) {
			setVaribleValue(selectedValue?.toString());
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variableData]);

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
			dependentVariablesStr += `${element}${existingVariables[element]?.selectedValue}`;
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
			// console.log('custom', variableData);

			const optionsData = sortValues(
				commaValuesParser(variableData.customValue || ''),
				variableData.sort,
			) as never;

			// console.log('optionsData', optionsData);

			setOptionsData(optionsData);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
		// console.log('handle change', variableData);
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
		if (debouncedVariableValue !== variableData?.selectedValue?.toString()) {
			handleChange(debouncedVariableValue);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedVariableValue]);

	useEffect(() => {
		// Fetch options for CUSTOM Type
		if (variableData.type === 'CUSTOM') {
			getOptions(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variableData.type, variableData.customValue]);

	return (
		<VariableContainer>
			<Typography.Text className="variable-name" ellipsis>
				${variableData.name}
			</Typography.Text>
			<VariableValue>
				{variableData.type === 'TEXTBOX' ? (
					<Input
						placeholder="Enter value"
						bordered={false}
						value={variableValue}
						onChange={(e): void => {
							setVaribleValue(e.target.value || '');
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
							value={selectValue}
							onChange={handleChange}
							bordered={false}
							placeholder="Select value"
							mode={mode}
							dropdownMatchSelectWidth={false}
							style={SelectItemStyle}
							loading={isLoading}
							showArrow
							showSearch
							data-testid="variable-select"
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
				{errorMessage && (
					<span style={{ margin: '0 0.5rem' }}>
						<Popover
							placement="top"
							content={<Typography>{errorMessage}</Typography>}
						>
							<WarningOutlined style={{ color: orange[5] }} />
						</Popover>
					</span>
				)}
			</VariableValue>
		</VariableContainer>
	);
}

export default memo(VariableItem);

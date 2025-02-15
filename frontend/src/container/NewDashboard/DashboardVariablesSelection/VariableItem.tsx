/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-nested-ternary */
import './DashboardVariableSelection.styles.scss';

import { orange } from '@ant-design/colors';
import { WarningOutlined } from '@ant-design/icons';
import {
	Checkbox,
	Input,
	Popover,
	Select,
	Tag,
	Tooltip,
	Typography,
} from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { debounce, isArray, isString } from 'lodash-es';
import map from 'lodash-es/map';
import { ChangeEvent, memo, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { VariableResponseProps } from 'types/api/dashboard/variables/query';
import { GlobalReducer } from 'types/reducer/globalTime';
import { popupContainer } from 'utils/selectPopupContainer';

import { variablePropsToPayloadVariables } from '../utils';
import { SelectItemStyle } from './styles';
import { areArraysEqual, checkAPIInvocation, IDependencyData } from './util';

const ALL_SELECT_VALUE = '__ALL__';

enum ToggleTagValue {
	Only = 'Only',
	All = 'All',
}

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

const getSelectValue = (
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
							let value = variableData.selectedValue;
							let allSelected = false;
							// The default value for multi-select is ALL and first value for
							// single select
							if (valueNotInList) {
								if (variableData.multiSelect) {
									value = newOptionsData;
									allSelected = true;
								} else {
									[value] = newOptionsData;
								}
							}

							if (variableData && variableData?.name && variableData?.id) {
								onValueUpdate(variableData.name, variableData.id, value, allSelected);
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

	const { isLoading } = useQuery(
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
					if (details.error.includes('Syntax error:')) {
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

	const handleChange = (value: string | string[]): void => {
		// if value is equal to selected value then return
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

	const mode: 'multiple' | undefined =
		variableData.multiSelect && !variableData.allSelected
			? 'multiple'
			: undefined;

	useEffect(() => {
		// Fetch options for CUSTOM Type
		if (variableData.type === 'CUSTOM') {
			getOptions(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [variableData.type, variableData.customValue]);

	const checkAll = (e: MouseEvent): void => {
		e.stopPropagation();
		e.preventDefault();
		const isChecked =
			variableData.allSelected || selectValue?.includes(ALL_SELECT_VALUE);

		if (isChecked) {
			handleChange([]);
		} else {
			handleChange(ALL_SELECT_VALUE);
		}
	};

	const handleOptionSelect = (
		e: CheckboxChangeEvent,
		option: string | number | boolean,
	): void => {
		const newSelectedValue = Array.isArray(selectedValue)
			? ((selectedValue.filter(
					(val) => val.toString() !== option.toString(),
			  ) as unknown) as string[])
			: [];

		if (
			!e.target.checked &&
			Array.isArray(selectedValueStringified) &&
			selectedValueStringified.includes(option.toString())
		) {
			if (newSelectedValue.length === 1) {
				handleChange(newSelectedValue[0].toString());
				return;
			}
			handleChange(newSelectedValue);
		} else if (!e.target.checked && selectedValue === option.toString()) {
			handleChange(ALL_SELECT_VALUE);
		} else if (newSelectedValue.length === optionsData.length - 1) {
			handleChange(ALL_SELECT_VALUE);
		}
	};

	const [optionState, setOptionState] = useState({
		tag: '',
		visible: false,
	});

	function currentToggleTagValue({
		option,
	}: {
		option: string;
	}): ToggleTagValue {
		if (
			option.toString() === selectValue ||
			(Array.isArray(selectValue) &&
				selectValue?.includes(option.toString()) &&
				selectValue.length === 1)
		) {
			return ToggleTagValue.All;
		}
		return ToggleTagValue.Only;
	}

	function handleToggle(e: ChangeEvent, option: string): void {
		e.stopPropagation();
		const mode = currentToggleTagValue({ option: option as string });
		const isChecked =
			variableData.allSelected ||
			option.toString() === selectValue ||
			(Array.isArray(selectValue) && selectValue?.includes(option.toString()));

		if (isChecked) {
			if (mode === ToggleTagValue.Only && variableData.multiSelect) {
				handleChange([option.toString()]);
			} else if (!variableData.multiSelect) {
				handleChange(option.toString());
			} else {
				handleChange(ALL_SELECT_VALUE);
			}
		} else {
			handleChange(option.toString());
		}
	}

	function retProps(
		option: string,
	): {
		onMouseOver: () => void;
		onMouseOut: () => void;
	} {
		return {
			onMouseOver: (): void =>
				setOptionState({
					tag: option.toString(),
					visible: true,
				}),
			onMouseOut: (): void =>
				setOptionState({
					tag: option.toString(),
					visible: false,
				}),
		};
	}

	const ensureValidOption = (option: string): boolean =>
		!(
			currentToggleTagValue({ option }) === ToggleTagValue.All && !enableSelectAll
		);

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
							placement="bottomLeft"
							mode={mode}
							style={SelectItemStyle}
							loading={isLoading}
							showSearch
							data-testid="variable-select"
							className="variable-select"
							popupClassName="dropdown-styles"
							maxTagCount={4}
							getPopupContainer={popupContainer}
							// eslint-disable-next-line react/no-unstable-nested-components
							tagRender={(props): JSX.Element => (
								<Tag closable onClose={props.onClose}>
									{props.value}
								</Tag>
							)}
							// eslint-disable-next-line react/no-unstable-nested-components
							maxTagPlaceholder={(omittedValues): JSX.Element => (
								<Tooltip title={omittedValues.map(({ value }) => value).join(', ')}>
									<span>+ {omittedValues.length} </span>
								</Tooltip>
							)}
							allowClear
						>
							{enableSelectAll && (
								<Select.Option data-testid="option-ALL" value={ALL_SELECT_VALUE}>
									<div className="all-label" onClick={(e): void => checkAll(e as any)}>
										<Checkbox checked={variableData.allSelected} />
										ALL
									</div>
								</Select.Option>
							)}
							{map(optionsData, (option) => (
								<Select.Option
									data-testid={`option-${option}`}
									key={option.toString()}
									value={option}
								>
									<div
										className={variableData.multiSelect ? 'dropdown-checkbox-label' : ''}
									>
										{variableData.multiSelect && (
											<Checkbox
												onChange={(e): void => {
													e.stopPropagation();
													e.preventDefault();
													handleOptionSelect(e, option);
												}}
												checked={
													variableData.allSelected ||
													option.toString() === selectValue ||
													(Array.isArray(selectValue) &&
														selectValue?.includes(option.toString()))
												}
											/>
										)}
										<div
											className="dropdown-value"
											{...retProps(option as string)}
											onClick={(e): void => handleToggle(e as any, option as string)}
										>
											<Typography.Text
												ellipsis={{
													tooltip: {
														placement: variableData.multiSelect ? 'top' : 'right',
														autoAdjustOverflow: true,
													},
												}}
												className="option-text"
											>
												{option.toString()}
											</Typography.Text>

											{variableData.multiSelect &&
												optionState.tag === option.toString() &&
												optionState.visible &&
												ensureValidOption(option as string) && (
													<Typography.Text className="toggle-tag-label">
														{currentToggleTagValue({ option: option as string })}
													</Typography.Text>
												)}
										</div>
									</div>
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

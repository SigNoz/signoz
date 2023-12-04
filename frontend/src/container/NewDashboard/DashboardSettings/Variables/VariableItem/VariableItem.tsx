/* eslint-disable sonarjs/cognitive-complexity */
import './VariableItem.styles.scss';

import { orange } from '@ant-design/colors';
import { Button, Divider, Input, Select, Switch, Tag, Typography } from 'antd';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import Editor from 'components/Editor';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { map } from 'lodash-es';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import {
	IDashboardVariable,
	TSortVariableValuesType,
	TVariableQueryType,
	VariableQueryTypeArr,
	VariableSortTypeArr,
} from 'types/api/dashboard/getAll';
import { v4 as generateUUID } from 'uuid';

import { variablePropsToPayloadVariables } from '../../../utils';
import { TVariableMode } from '../types';
import { LabelContainer, VariableItemRow } from './styles';

const { Option } = Select;

interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onCancel: () => void;
	onSave: (mode: TVariableMode, variableData: IDashboardVariable) => void;
	validateName: (arg0: string) => boolean;
	mode: TVariableMode;
}
function VariableItem({
	variableData,
	existingVariables,
	onCancel,
	onSave,
	validateName,
	mode,
}: VariableItemProps): JSX.Element {
	const [variableName, setVariableName] = useState<string>(
		variableData.name || '',
	);
	const [variableDescription, setVariableDescription] = useState<string>(
		variableData.description || '',
	);
	const [queryType, setQueryType] = useState<TVariableQueryType>(
		variableData.type || 'QUERY',
	);
	const [variableQueryValue, setVariableQueryValue] = useState<string>(
		variableData.queryValue || '',
	);
	const [variableCustomValue, setVariableCustomValue] = useState<string>(
		variableData.customValue || '',
	);
	const [variableTextboxValue, setVariableTextboxValue] = useState<string>(
		variableData.textboxValue || '',
	);
	const [
		variableSortType,
		setVariableSortType,
	] = useState<TSortVariableValuesType>(
		variableData.sort || VariableSortTypeArr[0],
	);
	const [variableMultiSelect, setVariableMultiSelect] = useState<boolean>(
		variableData.multiSelect || false,
	);
	const [variableShowALLOption, setVariableShowALLOption] = useState<boolean>(
		variableData.showALLOption || false,
	);
	const [previewValues, setPreviewValues] = useState<string[]>([]);

	// Error messages
	const [errorName, setErrorName] = useState<boolean>(false);
	const [errorPreview, setErrorPreview] = useState<string | null>(null);

	useEffect(() => {
		setPreviewValues([]);
		if (queryType === 'CUSTOM') {
			setPreviewValues(
				sortValues(
					commaValuesParser(variableCustomValue),
					variableSortType,
				) as never,
			);
		}
	}, [
		queryType,
		variableCustomValue,
		variableData.customValue,
		variableData.type,
		variableSortType,
	]);

	const handleSave = (): void => {
		console.log('handle Save', variableData);

		const variable: IDashboardVariable = {
			name: variableName,
			description: variableDescription,
			type: queryType,
			queryValue: variableQueryValue,
			customValue: variableCustomValue,
			textboxValue: variableTextboxValue,
			multiSelect: variableMultiSelect,
			showALLOption: variableShowALLOption,
			sort: variableSortType,
			...(queryType === 'TEXTBOX' && {
				selectedValue: (variableData.selectedValue ||
					variableTextboxValue) as never,
			}),
			modificationUUID: generateUUID(),
			id: variableData.id || generateUUID(),
			order: variableData.order,
		};

		onSave(mode, variable);
	};

	// Fetches the preview values for the SQL variable query
	const handleQueryResult = (response: any): void => {
		if (response?.payload?.variableValues)
			setPreviewValues(
				sortValues(
					response.payload?.variableValues || [],
					variableSortType,
				) as never,
			);
	};

	const { isFetching: previewLoading, refetch: runQuery } = useQuery(
		[REACT_QUERY_KEY.DASHBOARD_BY_ID, variableData.name, variableName],
		{
			enabled: false,
			queryFn: () =>
				dashboardVariablesQuery({
					query: variableQueryValue || '',
					variables: variablePropsToPayloadVariables(existingVariables),
				}),
			refetchOnWindowFocus: false,
			onSuccess: (response) => {
				setErrorPreview(null);
				handleQueryResult(response);
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
					setErrorPreview(message);
				}
			},
		},
	);

	const handleTestRunQuery = useCallback(() => {
		runQuery();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="variable-item-container">
			<div className="variable-item-content">
				<VariableItemRow>
					<LabelContainer>
						<Typography>Name</Typography>
					</LabelContainer>
					<div>
						<Input
							placeholder="Unique name of the variable"
							style={{ width: 400 }}
							value={variableName}
							onChange={(e): void => {
								setVariableName(e.target.value);
								setErrorName(
									!validateName(e.target.value) && e.target.value !== variableData.name,
								);
							}}
						/>
						<div>
							<Typography.Text type="warning">
								{errorName ? 'Variable name already exists' : ''}
							</Typography.Text>
						</div>
					</div>
				</VariableItemRow>
				<VariableItemRow>
					<LabelContainer>
						<Typography>Description</Typography>
					</LabelContainer>

					<Input.TextArea
						value={variableDescription}
						placeholder="Write description of the variable"
						style={{ width: 400 }}
						onChange={(e): void => setVariableDescription(e.target.value)}
					/>
				</VariableItemRow>
				<VariableItemRow>
					<LabelContainer>
						<Typography>Type</Typography>
					</LabelContainer>

					<Select
						defaultActiveFirstOption
						style={{ width: 400 }}
						onChange={(e: TVariableQueryType): void => {
							setQueryType(e);
						}}
						value={queryType}
					>
						<Option value={VariableQueryTypeArr[0]}>Query</Option>
						<Option value={VariableQueryTypeArr[1]}>Textbox</Option>
						<Option value={VariableQueryTypeArr[2]}>Custom</Option>
					</Select>
				</VariableItemRow>
				<Typography.Title
					level={5}
					style={{ marginTop: '1rem', marginBottom: '1rem' }}
				>
					Options
				</Typography.Title>
				{queryType === 'QUERY' && (
					<div className="query-container">
						<LabelContainer>
							<Typography>Query</Typography>
						</LabelContainer>

						<div style={{ flex: 1, position: 'relative' }}>
							<Editor
								language="sql"
								value={variableQueryValue}
								onChange={(e): void => setVariableQueryValue(e)}
								height="240px"
								options={{
									fontSize: 13,
									wordWrap: 'on',
									lineNumbers: 'off',
									glyphMargin: false,
									folding: false,
									lineDecorationsWidth: 0,
									lineNumbersMinChars: 0,
									minimap: {
										enabled: false,
									},
								}}
							/>
							<Button
								type="primary"
								size="small"
								onClick={handleTestRunQuery}
								style={{
									position: 'absolute',
									bottom: 0,
								}}
								loading={previewLoading}
							>
								Test Run Query
							</Button>
						</div>
					</div>
				)}
				{queryType === 'CUSTOM' && (
					<VariableItemRow>
						<LabelContainer>
							<Typography>Values separated by comma</Typography>
						</LabelContainer>
						<Input.TextArea
							value={variableCustomValue}
							placeholder="1, 10, mykey, mykey:myvalue"
							style={{ width: 400 }}
							onChange={(e): void => {
								setVariableCustomValue(e.target.value);
								setPreviewValues(
									sortValues(
										commaValuesParser(e.target.value),
										variableSortType,
									) as never,
								);
							}}
						/>
					</VariableItemRow>
				)}
				{queryType === 'TEXTBOX' && (
					<VariableItemRow>
						<LabelContainer>
							<Typography>Default Value</Typography>
						</LabelContainer>
						<Input
							value={variableTextboxValue}
							onChange={(e): void => {
								setVariableTextboxValue(e.target.value);
							}}
							placeholder="Default value if any"
							style={{ width: 400 }}
						/>
					</VariableItemRow>
				)}
				{(queryType === 'QUERY' || queryType === 'CUSTOM') && (
					<>
						<VariableItemRow>
							<LabelContainer>
								<Typography>Preview of Values</Typography>
							</LabelContainer>
							<div style={{ flex: 1 }}>
								{errorPreview ? (
									<Typography style={{ color: orange[5] }}>{errorPreview}</Typography>
								) : (
									map(previewValues, (value, idx) => (
										<Tag key={`${value}${idx}`}>{value.toString()}</Tag>
									))
								)}
							</div>
						</VariableItemRow>
						<VariableItemRow>
							<LabelContainer>
								<Typography>Sort</Typography>
							</LabelContainer>

							<Select
								defaultActiveFirstOption
								style={{ width: 400 }}
								defaultValue={VariableSortTypeArr[0]}
								value={variableSortType}
								onChange={(value: TSortVariableValuesType): void =>
									setVariableSortType(value)
								}
							>
								<Option value={VariableSortTypeArr[0]}>Disabled</Option>
								<Option value={VariableSortTypeArr[1]}>Ascending</Option>
								<Option value={VariableSortTypeArr[2]}>Descending</Option>
							</Select>
						</VariableItemRow>
						<VariableItemRow>
							<LabelContainer>
								<Typography>Enable multiple values to be checked</Typography>
							</LabelContainer>
							<Switch
								checked={variableMultiSelect}
								onChange={(e): void => {
									setVariableMultiSelect(e);
									if (!e) {
										setVariableShowALLOption(false);
									}
								}}
							/>
						</VariableItemRow>
						{variableMultiSelect && (
							<VariableItemRow>
								<LabelContainer>
									<Typography>Include an option for ALL values</Typography>
								</LabelContainer>
								<Switch
									checked={variableShowALLOption}
									onChange={(e): void => setVariableShowALLOption(e)}
								/>
							</VariableItemRow>
						)}
					</>
				)}
			</div>

			<div className="variable-item-footer">
				<Divider />
				<VariableItemRow>
					<Button type="primary" onClick={handleSave} disabled={errorName}>
						Save
					</Button>
					<Button type="default" onClick={onCancel}>
						Cancel
					</Button>
				</VariableItemRow>
			</div>
		</div>
	);
}

export default VariableItem;

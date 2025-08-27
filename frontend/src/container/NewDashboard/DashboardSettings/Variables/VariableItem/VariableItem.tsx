/* eslint-disable sonarjs/cognitive-complexity */
import './VariableItem.styles.scss';

import { orange } from '@ant-design/colors';
import { Button, Collapse, Input, Select, Switch, Tag, Typography } from 'antd';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import cx from 'classnames';
import Editor from 'components/Editor';
import { CustomSelect } from 'components/NewSelect';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { map } from 'lodash-es';
import {
	ArrowLeft,
	Check,
	ClipboardType,
	DatabaseZap,
	LayoutList,
	Pyramid,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	IDashboardVariable,
	TSortVariableValuesType,
	TVariableQueryType,
	VariableSortTypeArr,
} from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as generateUUID } from 'uuid';

import {
	buildDependencies,
	buildDependencyGraph,
} from '../../../DashboardVariablesSelection/util';
import { variablePropsToPayloadVariables } from '../../../utils';
import { TVariableMode } from '../types';
import DynamicVariable from './DynamicVariable/DynamicVariable';
import { LabelContainer, VariableItemRow } from './styles';
import { WidgetSelector } from './WidgetSelector';

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
		variableData.type || 'DYNAMIC',
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
	const [variableDefaultValue, setVariableDefaultValue] = useState<string>(
		(variableData.defaultValue as string) || '',
	);

	const [
		dynamicVariablesSelectedValue,
		setDynamicVariablesSelectedValue,
	] = useState<{ name: string; value: string }>();

	useEffect(() => {
		if (
			variableData.dynamicVariablesAttribute &&
			variableData.dynamicVariablesSource
		) {
			setDynamicVariablesSelectedValue({
				name: variableData.dynamicVariablesAttribute,
				value: variableData.dynamicVariablesSource,
			});
		}
	}, [
		variableData.dynamicVariablesAttribute,
		variableData.dynamicVariablesSource,
	]);
	// Error messages
	const [errorName, setErrorName] = useState<boolean>(false);
	const [errorNameMessage, setErrorNameMessage] = useState<string>('');
	const [errorPreview, setErrorPreview] = useState<string | null>(null);

	const REQUIRED_NAME_MESSAGE = 'Variable name is required';

	// Initialize error state for empty name
	useEffect(() => {
		if (!variableName.trim()) {
			setErrorName(true);
		}
	}, [variableName]);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data: fieldValues } = useGetFieldValues({
		signal:
			dynamicVariablesSelectedValue?.value === 'All Sources'
				? undefined
				: (dynamicVariablesSelectedValue?.value?.toLowerCase() as
						| 'traces'
						| 'logs'
						| 'metrics'),
		name: dynamicVariablesSelectedValue?.name || '',
		enabled:
			!!dynamicVariablesSelectedValue?.name &&
			!!dynamicVariablesSelectedValue?.value,
		startUnixMilli: minTime,
		endUnixMilli: maxTime,
	});

	const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);

	useEffect(() => {
		if (queryType === 'DYNAMIC') {
			setSelectedWidgets(variableData?.dynamicVariablesWidgetIds || []);
		}
	}, [queryType, variableData?.dynamicVariablesWidgetIds]);

	useEffect(() => {
		if (queryType === 'CUSTOM') {
			setPreviewValues(
				sortValues(
					commaValuesParser(variableCustomValue),
					variableSortType,
				) as never,
			);
		}
		if (queryType === 'QUERY') {
			setPreviewValues((prev) => sortValues(prev, variableSortType) as never);
		}
	}, [
		queryType,
		variableCustomValue,
		variableData.customValue,
		variableData.type,
		variableSortType,
	]);

	useEffect(() => {
		if (
			queryType === 'DYNAMIC' &&
			fieldValues &&
			dynamicVariablesSelectedValue?.name &&
			dynamicVariablesSelectedValue?.value
		) {
			setPreviewValues(
				sortValues(
					fieldValues.payload?.normalizedValues || [],
					variableSortType,
				) as never,
			);
		}
	}, [
		fieldValues,
		variableSortType,
		queryType,
		dynamicVariablesSelectedValue?.name,
		dynamicVariablesSelectedValue?.value,
		dynamicVariablesSelectedValue,
	]);

	const handleSave = (): void => {
		// Check for cyclic dependencies
		const newVariable = {
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
			...(queryType !== 'TEXTBOX' && {
				defaultValue: variableDefaultValue as never,
			}),
			modificationUUID: generateUUID(),
			id: variableData.id || generateUUID(),
			order: variableData.order,
			...(queryType === 'DYNAMIC' && {
				dynamicVariablesAttribute: dynamicVariablesSelectedValue?.name,
				dynamicVariablesSource: dynamicVariablesSelectedValue?.value,
			}),
			...(queryType === 'DYNAMIC' && {
				dynamicVariablesWidgetIds:
					selectedWidgets?.length > 0 ? selectedWidgets : [],
			}),
		};

		const allVariables = [...Object.values(existingVariables), newVariable];

		const dependencies = buildDependencies(allVariables);
		const { hasCycle, cycleNodes } = buildDependencyGraph(dependencies);

		if (hasCycle) {
			setErrorPreview(
				`Cannot save: Circular dependency detected between variables: ${cycleNodes?.join(
					' → ',
				)}`,
			);
			return;
		}

		onSave(mode, newVariable);
	};

	// Fetches the preview values for the SQL variable query
	const handleQueryResult = (response: any): void => {
		if (response?.payload?.variableValues) {
			setPreviewValues(
				sortValues(
					response.payload?.variableValues || [],
					variableSortType,
				) as never,
			);
		} else {
			setPreviewValues([]);
		}
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
					if ((details.error ?? '').toString().includes('Syntax error:')) {
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
		<>
			<div className="variable-item-container">
				<div className="all-variables">
					<Button
						type="text"
						className="all-variables-btn"
						icon={<ArrowLeft size={14} />}
						onClick={onCancel}
					>
						All variables
					</Button>
				</div>
				<div className="variable-item-content">
					<VariableItemRow className="variable-name-section">
						<LabelContainer>
							<Typography className="typography-variables">Name</Typography>
						</LabelContainer>
						<div>
							<Input
								placeholder="Unique name of the variable"
								value={variableName}
								className="name-input"
								onChange={({ target: { value } }): void => {
									setVariableName(value);

									// Check for empty name
									if (!value.trim()) {
										setErrorName(true);
										setErrorNameMessage(REQUIRED_NAME_MESSAGE);
									}
									// Check for duplicate name
									else if (!validateName(value) && value !== variableData.name) {
										setErrorName(true);
										setErrorNameMessage('Variable name already exists');
									}
									// No errors
									else {
										setErrorName(false);
										setErrorNameMessage('');
									}
								}}
							/>
							<div>
								<Typography.Text type="warning">{errorNameMessage}</Typography.Text>
							</div>
						</div>
					</VariableItemRow>
					<VariableItemRow className="variable-description-section">
						<LabelContainer>
							<Typography className="typography-variables">Description</Typography>
						</LabelContainer>

						<Input.TextArea
							value={variableDescription}
							placeholder="Enter a description for the variable"
							className="description-input"
							rows={3}
							onChange={(e): void => setVariableDescription(e.target.value)}
						/>
					</VariableItemRow>
					<VariableItemRow className="variable-type-section">
						<LabelContainer>
							<Typography className="typography-variables">Variable Type</Typography>
						</LabelContainer>

						<div className="variable-type-btn-group">
							<Button
								type="text"
								icon={<Pyramid size={14} />}
								className={cx(
									// eslint-disable-next-line sonarjs/no-duplicate-string
									'variable-type-btn',
									queryType === 'DYNAMIC' ? 'selected' : '',
								)}
								onClick={(): void => {
									setQueryType('DYNAMIC');
									setPreviewValues([]);
								}}
							>
								Dynamic
								<Tag bordered={false} className="sidenav-beta-tag" color="geekblue">
									Beta
								</Tag>
							</Button>
							<Button
								type="text"
								icon={<ClipboardType size={14} />}
								className={cx(
									'variable-type-btn',
									queryType === 'TEXTBOX' ? 'selected' : '',
								)}
								onClick={(): void => {
									setQueryType('TEXTBOX');
									setPreviewValues([]);
								}}
							>
								Textbox
							</Button>
							<Button
								type="text"
								icon={<LayoutList size={14} />}
								className={cx(
									'variable-type-btn',
									queryType === 'CUSTOM' ? 'selected' : '',
								)}
								onClick={(): void => {
									setQueryType('CUSTOM');
									setPreviewValues([]);
								}}
							>
								Custom
							</Button>
							<Button
								type="text"
								icon={<DatabaseZap size={14} />}
								className={cx(
									// eslint-disable-next-line sonarjs/no-duplicate-string
									'variable-type-btn',
									queryType === 'QUERY' ? 'selected' : '',
								)}
								onClick={(): void => {
									setQueryType('QUERY');
									setPreviewValues([]);
								}}
							>
								Query
								<Tag bordered={false} className="sidenav-beta-tag" color="warning">
									Not Recommended
								</Tag>
							</Button>
						</div>
					</VariableItemRow>
					{queryType === 'DYNAMIC' && (
						<div className="variable-dynamic-section">
							<DynamicVariable
								setDynamicVariablesSelectedValue={setDynamicVariablesSelectedValue}
								dynamicVariablesSelectedValue={dynamicVariablesSelectedValue}
							/>
						</div>
					)}
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
						<VariableItemRow className="variable-custom-section">
							<Collapse
								collapsible="header"
								rootClassName="custom-collapse"
								defaultActiveKey={['1']}
								items={[
									{
										key: '1',
										label: 'Options',
										children: (
											<Input.TextArea
												value={variableCustomValue}
												placeholder="Enter options separated by commas."
												rootClassName="comma-input"
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
										),
									},
								]}
							/>
						</VariableItemRow>
					)}
					{queryType === 'TEXTBOX' && (
						<VariableItemRow className="variable-textbox-section">
							<LabelContainer>
								<Typography className="typography-variables">Default Value</Typography>
							</LabelContainer>
							<Input
								value={variableTextboxValue}
								className="default-input"
								onChange={(e): void => {
									setVariableTextboxValue(e.target.value);
								}}
								placeholder="Enter a default value (if any)..."
								style={{ width: 400 }}
							/>
						</VariableItemRow>
					)}
					{(queryType === 'QUERY' ||
						queryType === 'CUSTOM' ||
						queryType === 'DYNAMIC') && (
						<>
							<VariableItemRow className="variables-preview-section">
								<LabelContainer style={{ width: '100%' }}>
									<Typography className="typography-variables">
										Preview of Values
									</Typography>
								</LabelContainer>
								<div className="preview-values">
									{errorPreview ? (
										<Typography style={{ color: orange[5] }}>{errorPreview}</Typography>
									) : (
										map(previewValues, (value, idx) => (
											<Tag key={`${value}${idx}`}>{value.toString()}</Tag>
										))
									)}
								</div>
							</VariableItemRow>
							<VariableItemRow className="sort-values-section">
								<LabelContainer>
									<Typography className="typography-variables">Sort Values</Typography>
									<Typography className="typography-sort">
										Sort the query output values
									</Typography>
								</LabelContainer>

								<Select
									defaultActiveFirstOption
									defaultValue={VariableSortTypeArr[0]}
									value={variableSortType}
									onChange={(value: TSortVariableValuesType): void =>
										setVariableSortType(value)
									}
									className="sort-input"
								>
									<Option value={VariableSortTypeArr[0]}>Disabled</Option>
									<Option value={VariableSortTypeArr[1]}>Ascending</Option>
									<Option value={VariableSortTypeArr[2]}>Descending</Option>
								</Select>
							</VariableItemRow>
							<VariableItemRow className="multiple-values-section">
								<LabelContainer>
									<Typography className="typography-variables">
										Enable multiple values to be checked
									</Typography>
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
								<VariableItemRow className="all-option-section">
									<LabelContainer>
										<Typography className="typography-variables">
											Include an option for ALL values
										</Typography>
									</LabelContainer>
									<Switch
										checked={variableShowALLOption}
										onChange={(e): void => setVariableShowALLOption(e)}
									/>
								</VariableItemRow>
							)}
							<VariableItemRow className="default-value-section">
								<LabelContainer>
									<Typography className="typography-variables">Default Value</Typography>
									<Typography className="default-value-description">
										{queryType === 'QUERY'
											? 'Click Test Run Query to see the values or add custom value'
											: 'Select a value from the preview values or add custom value'}
									</Typography>
								</LabelContainer>
								<CustomSelect
									placeholder="Select a default value"
									value={variableDefaultValue}
									onChange={(value): void => setVariableDefaultValue(value)}
									options={previewValues.map((value) => ({
										label: value,
										value,
									}))}
								/>
							</VariableItemRow>
						</>
					)}
					{queryType === 'DYNAMIC' && (
						<VariableItemRow className="dynamic-variable-section">
							<LabelContainer>
								<Typography className="typography-variables">
									Select Panels to apply this variable
								</Typography>
							</LabelContainer>
							<WidgetSelector
								selectedWidgets={selectedWidgets}
								setSelectedWidgets={setSelectedWidgets}
							/>
						</VariableItemRow>
					)}
				</div>
			</div>
			<div className="variable-item-footer">
				<VariableItemRow>
					<Button
						type="default"
						onClick={onCancel}
						icon={<X size={14} />}
						className="footer-btn-discard"
					>
						Discard
					</Button>
					<Button
						type="primary"
						onClick={handleSave}
						disabled={errorName}
						icon={<Check size={14} />}
						className="footer-btn-save"
					>
						Save Variable
					</Button>
				</VariableItemRow>
			</div>
		</>
	);
}

export default VariableItem;

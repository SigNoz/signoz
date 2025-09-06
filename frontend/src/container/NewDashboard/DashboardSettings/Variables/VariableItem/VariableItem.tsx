/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable sonarjs/cognitive-complexity */
import './VariableItem.styles.scss';

import { orange } from '@ant-design/colors';
import { Color } from '@signozhq/design-tokens';
import { Button, Collapse, Input, Select, Switch, Tag, Typography } from 'antd';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import cx from 'classnames';
import Editor from 'components/Editor';
import { CustomSelect } from 'components/NewSelect';
import TextToolTip from 'components/TextToolTip';
import { PANEL_GROUP_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	createDynamicVariableToWidgetsMap,
	getWidgetsHavingDynamicVariableAttribute,
} from 'hooks/dashboard/utils';
import { useGetFieldValues } from 'hooks/dynamicVariables/useGetFieldValues';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { isEmpty, map } from 'lodash-es';
import {
	ArrowLeft,
	Check,
	ClipboardType,
	DatabaseZap,
	Info,
	LayoutList,
	Pyramid,
	X,
} from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import {
	IDashboardVariable,
	TSortVariableValuesType,
	TVariableQueryType,
	VariableSortTypeArr,
	Widgets,
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
	onSave: (
		mode: TVariableMode,
		variableData: IDashboardVariable,
		widgetIds?: string[],
	) => void;
	validateName: (arg0: string) => boolean;
	validateAttributeKey: (
		attributeKey: string,
		currentVariableId?: string,
	) => boolean;
	mode: TVariableMode;
}
function VariableItem({
	variableData,
	existingVariables,
	onCancel,
	onSave,
	validateName,
	validateAttributeKey,
	mode,
}: VariableItemProps): JSX.Element {
	const [variableName, setVariableName] = useState<string>(
		variableData.name || '',
	);
	const [
		hasUserManuallyChangedName,
		setHasUserManuallyChangedName,
	] = useState<boolean>(false);
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

	const isDarkMode = useIsDarkMode();

	const [
		dynamicVariablesSelectedValue,
		setDynamicVariablesSelectedValue,
	] = useState<{ name: string; value: string }>();

	// Error messages
	const [errorName, setErrorName] = useState<boolean>(false);
	const [errorNameMessage, setErrorNameMessage] = useState<string>('');
	const [errorAttributeKey, setErrorAttributeKey] = useState<boolean>(false);
	const [
		errorAttributeKeyMessage,
		setErrorAttributeKeyMessage,
	] = useState<string>('');
	const [errorPreview, setErrorPreview] = useState<string | null>(null);

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

	// Validate attribute key uniqueness for dynamic variables
	useEffect(() => {
		if (queryType === 'DYNAMIC' && dynamicVariablesSelectedValue?.name) {
			if (
				!validateAttributeKey(dynamicVariablesSelectedValue.name, variableData.id)
			) {
				setErrorAttributeKey(true);
				setErrorAttributeKeyMessage(
					'A variable with this attribute key already exists',
				);
			} else {
				setErrorAttributeKey(false);
				setErrorAttributeKeyMessage('');
			}
		} else {
			setErrorAttributeKey(false);
			setErrorAttributeKeyMessage('');
		}
	}, [
		queryType,
		dynamicVariablesSelectedValue?.name,
		validateAttributeKey,
		variableData.id,
	]);

	// Auto-set variable name to selected attribute name in creation mode when user hasn't manually changed it
	useEffect(() => {
		if (
			mode === 'ADD' && // Only in creation mode
			queryType === 'DYNAMIC' && // Only for dynamic variables
			dynamicVariablesSelectedValue?.name && // Attribute is selected
			!hasUserManuallyChangedName // User hasn't manually changed the name
		) {
			const newName = dynamicVariablesSelectedValue.name;
			setVariableName(newName);

			// Trigger validation for the auto-set name
			if (/\s/.test(newName)) {
				setErrorName(true);
				setErrorNameMessage('Variable name cannot contain whitespaces');
			} else if (!validateName(newName)) {
				setErrorName(true);
				setErrorNameMessage('Variable name already exists');
			} else {
				setErrorName(false);
				setErrorNameMessage('');
			}
		}
	}, [
		mode,
		queryType,
		dynamicVariablesSelectedValue?.name,
		hasUserManuallyChangedName,
		validateName,
	]);

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
			dynamicVariablesSelectedValue?.value === 'All telemetry'
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

	const { selectedDashboard } = useDashboard();

	useEffect(() => {
		const dynamicVariables = Object.values(
			selectedDashboard?.data?.variables || {},
		)?.filter((variable: IDashboardVariable) => variable.type === 'DYNAMIC');

		const widgets =
			selectedDashboard?.data?.widgets?.filter(
				(widget) => widget.panelTypes !== PANEL_GROUP_TYPES.ROW,
			) || [];
		const widgetsHavingDynamicVariables = createDynamicVariableToWidgetsMap(
			dynamicVariables,
			widgets as Widgets[],
		);

		if (variableData?.id && variableData.id in widgetsHavingDynamicVariables) {
			setSelectedWidgets(widgetsHavingDynamicVariables[variableData.id] || []);
		} else if (dynamicVariablesSelectedValue?.name) {
			const widgets = getWidgetsHavingDynamicVariableAttribute(
				dynamicVariablesSelectedValue?.name,
				(selectedDashboard?.data?.widgets?.filter(
					(widget) => widget.panelTypes !== PANEL_GROUP_TYPES.ROW,
				) || []) as Widgets[],
				variableData.name,
			);
			setSelectedWidgets(widgets || []);
		}
	}, [
		dynamicVariablesSelectedValue?.name,
		selectedDashboard,
		variableData.id,
		variableData.name,
	]);

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
					fieldValues.data?.normalizedValues || [],
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
	]);

	const variableValue = useMemo(() => {
		if (variableMultiSelect) {
			let value = variableData.selectedValue;
			if (isEmpty(value)) {
				if (variableData.showALLOption) {
					if (variableDefaultValue) {
						value = variableDefaultValue;
					} else {
						value = previewValues;
					}
				} else if (variableDefaultValue) {
					value = variableDefaultValue;
				} else {
					value = previewValues?.[0];
				}
			}

			return value;
		}

		if (isEmpty(variableData.selectedValue)) {
			if (variableDefaultValue) {
				return variableDefaultValue;
			}
			return previewValues?.[0]?.toString();
		}

		return variableData.selectedValue || variableDefaultValue;
	}, [
		variableMultiSelect,
		variableData.selectedValue,
		variableData.showALLOption,
		variableDefaultValue,
		previewValues,
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
			showALLOption: queryType === 'DYNAMIC' ? true : variableShowALLOption,
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
			selectedValue: variableValue,
			allSelected: variableData.allSelected,
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

		onSave(mode, newVariable, selectedWidgets);
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
									setHasUserManuallyChangedName(true); // Mark that user has manually changed the name

									// Check for empty name
									if (!value.trim()) {
										setErrorName(true);
										setErrorNameMessage(REQUIRED_NAME_MESSAGE);
									}
									// Check for whitespace in name
									else if (/\s/.test(value)) {
										setErrorName(true);
										setErrorNameMessage('Variable name cannot contain whitespaces');
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
						<LabelContainer className="variable-type-label-container">
							<Typography className="typography-variables">Variable Type</Typography>
							<TextToolTip
								text="Learn more about supported variable types"
								url="https://signoz.io/docs/userguide/manage-variables/#supported-variable-types"
								urlText="here"
								useFilledIcon={false}
								outlinedIcon={
									<Info
										size={14}
										style={{
											color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500,
											marginTop: 1,
										}}
									/>
								}
							/>
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
									// Reset manual change flag if no name is entered
									if (!variableName.trim()) {
										setHasUserManuallyChangedName(false);
									}
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
									// Reset manual change flag if no name is entered
									if (!variableName.trim()) {
										setHasUserManuallyChangedName(false);
									}
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
									// Reset manual change flag if no name is entered
									if (!variableName.trim()) {
										setHasUserManuallyChangedName(false);
									}
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
									// Reset manual change flag if no name is entered
									if (!variableName.trim()) {
										setHasUserManuallyChangedName(false);
									}
								}}
							>
								Query
								<Tag bordered={false} className="sidenav-beta-tag" color="warning">
									Not Recommended
								</Tag>
								<div onClick={(e): void => e.stopPropagation()}>
									<TextToolTip
										text="Learn why we don't recommend"
										url="https://signoz.io/docs/userguide/manage-variables/#why-avoid-clickhouse-query-variables"
										urlText="here"
										useFilledIcon={false}
										outlinedIcon={
											<Info
												size={14}
												style={{
													color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500,
													marginTop: 1,
												}}
											/>
										}
									/>
								</div>
							</Button>
						</div>
					</VariableItemRow>
					{queryType === 'DYNAMIC' && (
						<div className="variable-dynamic-section">
							<DynamicVariable
								setDynamicVariablesSelectedValue={setDynamicVariablesSelectedValue}
								dynamicVariablesSelectedValue={dynamicVariablesSelectedValue}
								errorAttributeKeyMessage={errorAttributeKeyMessage}
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
							{variableMultiSelect && queryType !== 'DYNAMIC' && (
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
						disabled={errorName || errorAttributeKey}
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

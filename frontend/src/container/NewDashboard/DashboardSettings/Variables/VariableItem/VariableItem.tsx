/* eslint-disable sonarjs/cognitive-complexity */
import { orange } from '@ant-design/colors';
import { DeleteOutlined } from '@ant-design/icons';
import {
	Button,
	Col,
	Divider,
	Input,
	Select,
	Switch,
	Tag,
	Typography,
} from 'antd';
import query from 'api/dashboard/variables/query';
import Editor from 'components/Editor';
import CustomDateTimeModal, {
	DateTimeRangeType,
} from 'container/TopNav/CustomDateTimeModal';
import dayjs from 'dayjs';
import { commaValuesParser } from 'lib/dashbaordVariables/customCommaValuesParser';
import sortValues from 'lib/dashbaordVariables/sortVariableValues';
import { map } from 'lodash-es';
import { ReactNode, useEffect, useState } from 'react';
import {
	IDashboardVariable,
	TSortVariableValuesType,
	TVariableQueryType,
	VariableQueryTypeArr,
	VariableSortTypeArr,
} from 'types/api/dashboard/getAll';
import { v4 } from 'uuid';

import { variablePropsToPayloadVariables } from '../../../utils';
import { TVariableViewMode } from '../types';
import { LabelContainer, VariableItemRow } from './styles';

const { Option } = Select;

interface VariableItemProps {
	variableData: IDashboardVariable;
	existingVariables: Record<string, IDashboardVariable>;
	onCancel: () => void;
	onSave: (name: string, arg0: IDashboardVariable, arg1: string) => void;
	validateName: (arg0: string) => boolean;
	variableViewMode: TVariableViewMode;
}

const timeSelectionOptions = [
	'5 min',
	'15 min',
	'30 min',
	'1 hour',
	'6 hours',
	'1 day',
	'1 week',
];

function VariableItem({
	variableData,
	existingVariables,
	onCancel,
	onSave,
	validateName,
	variableViewMode,
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

	// Internal states
	const [previewLoading, setPreviewLoading] = useState<boolean>(false);
	// Error messages
	const [errorName, setErrorName] = useState<boolean>(false);
	const [errorPreview, setErrorPreview] = useState<string | null>(null);

	const [isTimePickerOpen, setIsTimePickerOpen] = useState<boolean>(false);
	const [subgroups, setSubgroups] = useState<{ id: string; value: string }[]>(
		variableData.customVariableSubgroups || [],
	);
	const [variableTimeRanges, setVariableTimeRanges] = useState<
		IDashboardVariable['customVariableTimeRanges']
	>(variableData.customVariableTimeRanges || []);
	const [selectedTimeRange, setSelectedTimeRange] = useState<number>(0);

	useEffect(() => {
		setPreviewValues([]);
		if (queryType === 'CUSTOM') {
			const comma = variableCustomValue.slice(-1) === ',' ? '' : ',';
			const subGroupsValues = subgroups.map(({ value }) => value);
			setPreviewValues(
				sortValues(
					commaValuesParser(variableCustomValue + comma + subGroupsValues.join()),
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
		subgroups,
	]);

	const handleSave = (): void => {
		const newVariableData: IDashboardVariable = {
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
			...(queryType === 'CUSTOM' && {
				customVariableSubgroups: subgroups,
				customVariableTimeRanges: variableTimeRanges,
			}),
			modificationUUID: v4(),
		};
		onSave(
			variableName,
			newVariableData,
			(variableViewMode === 'EDIT' && variableName !== variableData.name
				? variableData.name
				: '') as string,
		);
		onCancel();
	};

	// Fetches the preview values for the SQL variable query
	const handleQueryResult = async (): Promise<void> => {
		setPreviewLoading(true);
		setErrorPreview(null);
		try {
			const variableQueryResponse = await query({
				query: variableQueryValue,
				variables: variablePropsToPayloadVariables(existingVariables),
			});
			setPreviewLoading(false);
			if (variableQueryResponse.error) {
				let message = variableQueryResponse.error;
				if (variableQueryResponse.error.includes('Syntax error:')) {
					message =
						'Please make sure query is valid and dependent variables are selected';
				}
				setErrorPreview(message);
				return;
			}
			if (variableQueryResponse.payload?.variableValues)
				setPreviewValues(
					sortValues(
						variableQueryResponse.payload?.variableValues || [],
						variableSortType,
					) as never,
				);
		} catch (e) {
			console.error(e);
		}
	};

	const updateTimeRange = (
		index: number,
		data: {
			time?: {
				startTime?: number;
				endTime?: number;
				selectedTime: TimeOptions;
			};
			groups?: string[];
		},
	): void => {
		setVariableTimeRanges((prevTimeRange) => {
			const updatedTimeRange = [...(prevTimeRange || [])];
			if (data.time) {
				updatedTimeRange.splice(index, 1, {
					...updatedTimeRange[index],
					...data.time,
				});
			}
			if (data.groups) {
				updatedTimeRange.splice(index, 1, {
					...updatedTimeRange[index],
					...{ groups: data.groups },
				});
			}
			return updatedTimeRange;
		});
	};

	const updateTimeRangesOnDeleteGroup = (id: string): void => {
		variableTimeRanges?.forEach((timeRange, index): void => {
			if (timeRange.groups?.includes(id)) {
				updateTimeRange(index, {
					groups: timeRange.groups?.filter((groupId) => groupId !== id) || [],
				});
			}
		});
	};

	const updateGroups = (
		action: 'add' | 'update' | 'remove',
		id?: string,
		value?: string,
	): void => {
		setSubgroups((prevGroup) => {
			const updatedGroup = [...prevGroup];
			if (action === 'update' && id) {
				const groupIndex = updatedGroup.findIndex((item) => item.id === id);
				updatedGroup.splice(groupIndex, 1, { value: value || '', id });
			}

			if (action === 'add') {
				updatedGroup.push({
					id: v4(),
					value: '',
				});
			}

			if (action === 'remove' && id) {
				updatedGroup.forEach((item, index) => {
					if (item.id === id) {
						updatedGroup.splice(index, 1);
						updateTimeRangesOnDeleteGroup(id);
					}
				});
			}

			return updatedGroup;
		});
	};

	const onSelectTimeRangeGroup = (selectedGroups: string[]): void => {
		updateTimeRange(selectedTimeRange, { groups: selectedGroups });
	};

	const addTimeRange = (): void => {
		setVariableTimeRanges((prevTimeRange) => {
			const updatedTimeRange = [...(prevTimeRange || [])];
			updatedTimeRange.push({});
			setSelectedTimeRange(updatedTimeRange.length - 1);
			return updatedTimeRange;
		});
	};

	const removeTimeRange = (index: number): void => {
		setVariableTimeRanges((prevTimeRange) => {
			const updatedTimeRange = [...(prevTimeRange || [])];
			updatedTimeRange.splice(index, 1);
			setSelectedTimeRange(updatedTimeRange.length - 1);
			return updatedTimeRange;
		});
	};

	const handleSelectTime = (dateTimeRange: DateTimeRangeType): void => {
		if (dateTimeRange) {
			const [startTime, endTime] = dateTimeRange;
			if (startTime && endTime) {
				updateTimeRange(selectedTimeRange, {
					time: {
						startTime: startTime.toDate().getTime(),
						endTime: endTime.toDate().getTime(),
						selectedTime: 'custom',
					},
				});
			}
		}
		setIsTimePickerOpen(false);
	};
	const onSelectTimeRangeOption = (
		option: TimeOptions,
		timeRangeIndex: number,
	): void => {
		if (option === 'custom') {
			setSelectedTimeRange(timeRangeIndex);
			setIsTimePickerOpen(true);
			return;
		}
		updateTimeRange(timeRangeIndex, {
			time: {
				selectedTime: option,
			},
		});
	};

	const displayCustomTimeRange = (timeRange: {
		startTime?: number;
		endTime?: number;
		groups?: string[];
		selectedTime?: TimeOptions;
	}): string =>
		`${dayjs(timeRange.startTime).format('YYYY-MM-DD HH:mm')} - ${dayjs(
			timeRange.endTime,
		).format('YYYY-MM-DD HH:mm')}`;

	return (
		<Col>
			{/* <Typography.Title level={3}>Add Variable</Typography.Title> */}
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
				<VariableItemRow>
					<LabelContainer>
						<Typography>Query</Typography>
					</LabelContainer>

					<div style={{ flex: 1, position: 'relative' }}>
						<Editor
							language="sql"
							value={variableQueryValue}
							onChange={(e): void => setVariableQueryValue(e)}
							height="300px"
						/>
						<Button
							type="primary"
							onClick={handleQueryResult}
							style={{
								position: 'absolute',
								bottom: 0,
							}}
							loading={previewLoading}
						>
							Test Run Query
						</Button>
					</div>
				</VariableItemRow>
			)}
			{queryType === 'CUSTOM' && (
				<>
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
							}}
						/>
						{subgroups.map((subgroup, index) => (
							<VariableItemRow style={{ marginBottom: '0' }} key={subgroup.id}>
								<LabelContainer>
									<Typography>Subgroup {index + 1}</Typography>
								</LabelContainer>
								<Input.TextArea
									value={subgroup.value}
									placeholder="1, 10, mykey, mykey:myvalue"
									style={{ width: 400 }}
									onChange={(e): void => {
										updateGroups('update', subgroup.id, e.target.value);
									}}
								/>
								<DeleteOutlined
									style={{ alignSelf: 'center' }}
									onClick={(): void => updateGroups('remove', subgroup.id)}
								>
									remove
								</DeleteOutlined>
							</VariableItemRow>
						))}
						<Button
							style={{ alignSelf: 'center' }}
							onClick={(): void => updateGroups('add')}
						>
							Add Group
						</Button>
					</VariableItemRow>
					{subgroups.length > 0 && (
						<VariableItemRow>
							{variableTimeRanges?.map(
								(timeRange, idx): ReactNode => (
									<Col span={8} key={v4()}>
										<div
											style={{
												width: '100%',
												flexWrap: 'wrap',
												display: 'flex',
												alignItems: 'center',
												marginBottom: '1rem',
											}}
										>
											<p style={{ flexBasis: '50%' }}>Time Range {idx + 1}</p>
											<Select
												style={{ flexBasis: '50%' }}
												onSelect={(e): void => {
													onSelectTimeRangeOption(e, idx);
												}}
												placeholder="Select Time Range"
												value={timeRange.selectedTime}
											>
												{timeSelectionOptions.map(
													(item): ReactNode => (
														<Select.Option key={item} value={item}>
															{`Last ${item}`}
														</Select.Option>
													),
												)}
												<Select.Option key="custom" value="custom">
													Custom
												</Select.Option>
											</Select>

											{timeRange.selectedTime === 'custom' && (
												<p style={{ flexBasis: '100%', margin: '0px' }}>
													{displayCustomTimeRange(timeRange)}
												</p>
											)}

											{timeRange.selectedTime && (
												<Select
													onDropdownVisibleChange={(e): void => {
														if (e) {
															setSelectedTimeRange(idx);
														}
													}}
													mode="multiple"
													style={{ width: '100%' }}
													placeholder="Select an group"
													onChange={onSelectTimeRangeGroup}
													value={timeRange.groups}
												>
													{subgroups.map((subgroup, index) => (
														<Select.Option key={subgroup.id} value={subgroup.id}>
															Group {index + 1}
														</Select.Option>
													))}
												</Select>
											)}

											<Button onClick={(): void => removeTimeRange(idx)}>
												Remove Time Range
											</Button>
										</div>
									</Col>
								),
							)}
							<Button onClick={addTimeRange}>Add Time Range</Button>
						</VariableItemRow>
					)}
					<CustomDateTimeModal
						visible={isTimePickerOpen}
						onCancel={(): void => setIsTimePickerOpen(false)}
						onCreate={handleSelectTime}
					/>
				</>
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
			<Divider />
			<VariableItemRow>
				<Button type="primary" onClick={handleSave} disabled={errorName}>
					Save
				</Button>
				<Button type="dashed" onClick={onCancel}>
					Cancel
				</Button>
			</VariableItemRow>
		</Col>
	);
}

type TimeOptions =
	| '5 min'
	| '15 min'
	| '30 min'
	| '1 hour'
	| '6 hour'
	| '1 day'
	| '1 week'
	| 'custom';

export default VariableItem;

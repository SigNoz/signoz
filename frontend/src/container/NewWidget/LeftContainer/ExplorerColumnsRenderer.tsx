/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
import './ExplorerColumnsRenderer.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Divider, Dropdown, Input, Tooltip, Typography } from 'antd';
import { MenuProps } from 'antd/lib';
import { FieldDataType, TelemetryFieldKey } from 'api/v5/v5';
import FieldVariantBadges from 'components/FieldVariantBadges/FieldVariantBadges';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import {
	getUniqueColumnKey,
	getVariantCounts,
} from 'container/OptionsMenu/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import {
	AlertCircle,
	GripVertical,
	PlusCircle,
	Search,
	Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	DragDropContext,
	Draggable,
	Droppable,
	DropResult,
} from 'react-beautiful-dnd';
import { IField } from 'types/api/logs/fields';
import { DataSource } from 'types/common/queryBuilder';

import { WidgetGraphProps } from '../types';
import ExplorerAttributeColumns from './ExplorerAttributeColumns';

type LogColumnsRendererProps = {
	setSelectedLogFields: WidgetGraphProps['setSelectedLogFields'];
	selectedLogFields: WidgetGraphProps['selectedLogFields'];
	selectedTracesFields: WidgetGraphProps['selectedTracesFields'];
	setSelectedTracesFields: WidgetGraphProps['setSelectedTracesFields'];
};

function ExplorerColumnsRenderer({
	selectedLogFields,
	setSelectedLogFields,
	selectedTracesFields,
	setSelectedTracesFields,
}: LogColumnsRendererProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const [searchText, setSearchText] = useState<string>('');
	const [querySearchText, setQuerySearchText] = useState<string>('');
	const [open, setOpen] = useState<boolean>(false);

	const initialDataSource = currentQuery.builder.queryData[0].dataSource;

	// const { data, isLoading, isError } = useGetAggregateKeys(
	// 	{
	// 		aggregateAttribute: '',
	// 		dataSource: currentQuery.builder.queryData[0].dataSource,
	// 		aggregateOperator: currentQuery.builder.queryData[0].aggregateOperator,
	// 		searchText: querySearchText,
	// 		tagType: '',
	// 	},
	// 	{
	// 		queryKey: [
	// 			currentQuery.builder.queryData[0].dataSource,
	// 			currentQuery.builder.queryData[0].aggregateOperator,
	// 			querySearchText,
	// 		],
	// 	},
	// );

	const { data, isLoading, isError } = useGetQueryKeySuggestions(
		{
			searchText: querySearchText,
			signal: currentQuery.builder.queryData[0].dataSource,
		},
		{
			queryKey: [
				currentQuery.builder.queryData[0].dataSource,
				currentQuery.builder.queryData[0].aggregateOperator,
				querySearchText,
			],
		},
	);

	const isAttributeKeySelected = (attribute: any): boolean => {
		const uniqueKey = getUniqueColumnKey(attribute);

		if (initialDataSource === DataSource.LOGS && selectedLogFields) {
			return selectedLogFields.some(
				(field) => getUniqueColumnKey(field) === uniqueKey,
			);
		}
		if (initialDataSource === DataSource.TRACES && selectedTracesFields) {
			return selectedTracesFields.some(
				(field) => getUniqueColumnKey(field) === uniqueKey,
			);
		}
		return false;
	};

	const handleCheckboxChange = (attribute: any): void => {
		const uniqueKey = getUniqueColumnKey(attribute);

		if (
			initialDataSource === DataSource.LOGS &&
			setSelectedLogFields !== undefined
		) {
			if (selectedLogFields) {
				if (isAttributeKeySelected(attribute)) {
					setSelectedLogFields(
						selectedLogFields.filter(
							(field) => getUniqueColumnKey(field) !== uniqueKey,
						),
					);
				} else {
					setSelectedLogFields([
						...selectedLogFields,
						{
							name: attribute.name,
							dataType: attribute.fieldDataType || 'string',
							type: attribute.fieldContext || '',
							fieldDataType: attribute.fieldDataType || 'string',
							fieldContext: attribute.fieldContext || 'log',
						} as IField & { fieldDataType: string; fieldContext: string },
					]);
				}
			} else {
				setSelectedLogFields([
					{
						name: attribute.name,
						dataType: attribute.fieldDataType || 'string',
						type: attribute.fieldContext || '',
						fieldDataType: attribute.fieldDataType || 'string',
						fieldContext: attribute.fieldContext || 'log',
					} as IField & { fieldDataType: string; fieldContext: string },
				]);
			}
		} else if (
			initialDataSource === DataSource.TRACES &&
			setSelectedTracesFields !== undefined
		) {
			if (selectedTracesFields) {
				if (isAttributeKeySelected(attribute)) {
					setSelectedTracesFields(
						selectedTracesFields.filter(
							(field) => getUniqueColumnKey(field) !== uniqueKey,
						),
					);
				} else {
					setSelectedTracesFields([
						...selectedTracesFields,
						{
							...attribute,
							fieldDataType: attribute.fieldDataType as FieldDataType,
						},
					]);
				}
			} else {
				setSelectedTracesFields([
					{
						...attribute,
						fieldDataType: attribute.fieldDataType as FieldDataType,
					},
				]);
			}
		}
		setOpen(false);
	};

	const debouncedSetQuerySearchText = useDebouncedFn((value) => {
		setQuerySearchText(value as string);
	}, 400);

	useEffect(
		() => (): void => {
			debouncedSetQuerySearchText.cancel();
		},
		[debouncedSetQuerySearchText],
	);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchText(e.target.value);
		debouncedSetQuerySearchText(e.target.value);
	};

	const items: MenuProps['items'] = [
		{
			key: 'search',
			label: (
				<Input
					type="text"
					placeholder="Search"
					className="explorer-columns-search"
					value={searchText}
					onChange={handleSearchChange}
					prefix={<Search size={16} style={{ padding: '6px' }} />}
				/>
			),
		},
		{
			key: 'columns',
			label: (
				<ExplorerAttributeColumns
					isLoading={isLoading}
					data={data}
					searchText={searchText}
					isAttributeKeySelected={isAttributeKeySelected}
					handleCheckboxChange={handleCheckboxChange}
					dataSource={initialDataSource}
				/>
			),
		},
	];

	const removeSelectedLogField = (field: any): void => {
		const uniqueKey = getUniqueColumnKey(field);

		if (
			initialDataSource === DataSource.LOGS &&
			setSelectedLogFields &&
			selectedLogFields
		) {
			setSelectedLogFields(
				selectedLogFields.filter(
					(field) => getUniqueColumnKey(field) !== uniqueKey,
				),
			);
		}
		if (
			initialDataSource === DataSource.TRACES &&
			setSelectedTracesFields &&
			selectedTracesFields
		) {
			setSelectedTracesFields(
				selectedTracesFields.filter(
					(field) => getUniqueColumnKey(field) !== uniqueKey,
				),
			);
		}
	};

	const onDragEnd = (result: DropResult): void => {
		if (!result.destination) {
			return;
		}

		if (
			initialDataSource === DataSource.LOGS &&
			selectedLogFields &&
			setSelectedLogFields
		) {
			const items = [...selectedLogFields];
			const [reorderedItem] = items.splice(result.source.index, 1);
			items.splice(result.destination.index, 0, reorderedItem);

			setSelectedLogFields(items);
		}
		if (
			initialDataSource === DataSource.TRACES &&
			selectedTracesFields &&
			setSelectedTracesFields
		) {
			const items = [...selectedTracesFields];
			const [reorderedItem] = items.splice(result.source.index, 1);
			items.splice(result.destination.index, 0, reorderedItem);

			setSelectedTracesFields(items);
		}
	};

	const toggleDropdown = (): void => {
		setOpen(!open);
		if (!open) {
			setSearchText('');
		}
	};

	const isDarkMode = useIsDarkMode();

	// Detect which column names have multiple variants from API data
	const allAttributeKeys =
		Object.values(data?.data?.data?.keys || {})?.flat() || [];
	const nameCounts = getVariantCounts(allAttributeKeys as TelemetryFieldKey[]);

	return (
		<div className="explorer-columns-renderer">
			<div className="title">
				<Typography.Text>Columns</Typography.Text>
				{isError && (
					<Tooltip title={SOMETHING_WENT_WRONG}>
						<AlertCircle size={16} data-testid="alert-circle-icon" />
					</Tooltip>
				)}
			</div>
			<Divider />
			{!isError && (
				<div className="explorer-columns-contents">
					<DragDropContext onDragEnd={onDragEnd}>
						<Droppable droppableId="drag-drop-list" direction="horizontal">
							{(provided): JSX.Element => (
								<div
									className="explorer-columns"
									{...provided.droppableProps}
									ref={provided.innerRef}
								>
									{initialDataSource === DataSource.LOGS &&
										selectedLogFields &&
										selectedLogFields.map((field: TelemetryFieldKey, index) => (
											// eslint-disable-next-line react/no-array-index-key
											<Draggable key={index} draggableId={index.toString()} index={index}>
												{(dragProvided): JSX.Element => (
													<div
														className="explorer-column-card"
														ref={dragProvided.innerRef}
														{...dragProvided.draggableProps}
														{...dragProvided.dragHandleProps}
													>
														<div className="explorer-column-title">
															<GripVertical size={12} color="#5A5A5A" />
															<span className="column-name-wrapper">
																{field.name}
																{nameCounts[field.name] > 1 && (
																	<span className="badges-container">
																		<FieldVariantBadges
																			fieldDataType={field.fieldDataType}
																			fieldContext={field.fieldContext}
																		/>
																	</span>
																)}
															</span>
														</div>
														<Trash2
															size={12}
															color="red"
															onClick={(): void => removeSelectedLogField(field)}
															data-testid="trash-icon"
														/>
													</div>
												)}
											</Draggable>
										))}
									{initialDataSource === DataSource.TRACES &&
										selectedTracesFields &&
										selectedTracesFields.map((field, index) => (
											// eslint-disable-next-line react/no-array-index-key
											<Draggable key={index} draggableId={index.toString()} index={index}>
												{(dragProvided): JSX.Element => (
													<div
														className="explorer-column-card"
														ref={dragProvided.innerRef}
														{...dragProvided.draggableProps}
														{...dragProvided.dragHandleProps}
													>
														<div className="explorer-column-title">
															<GripVertical size={12} color="#5A5A5A" />
															<span className="column-name-wrapper">
																{field?.name || field?.key}
																{nameCounts[field?.name || ''] > 1 && (
																	<span className="badges-container">
																		<FieldVariantBadges
																			fieldDataType={field.fieldDataType}
																			fieldContext={field.fieldContext}
																		/>
																	</span>
																)}
															</span>
														</div>
														<Trash2
															size={12}
															color="red"
															onClick={(): void => removeSelectedLogField(field)}
															data-testid="trash-icon"
														/>
													</div>
												)}
											</Draggable>
										))}
								</div>
							)}
						</Droppable>
					</DragDropContext>
					<div>
						<Dropdown
							menu={{ items }}
							arrow
							placement="top"
							open={open}
							overlayClassName="explorer-columns-dropdown"
						>
							<Button
								className="action-btn"
								data-testid="add-columns-button"
								icon={
									<PlusCircle
										size={16}
										color={isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100}
									/>
								}
								onClick={toggleDropdown}
							/>
						</Dropdown>
					</div>
				</div>
			)}
		</div>
	);
}

export default ExplorerColumnsRenderer;

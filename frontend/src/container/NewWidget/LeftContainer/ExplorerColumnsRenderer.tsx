/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
import './ExplorerColumnsRenderer.styles.scss';

import { Button, Checkbox, Divider, Dropdown, Input, Typography } from 'antd';
import { MenuProps } from 'antd/lib';
import Spinner from 'components/Spinner';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GripVertical, PlusCircle, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
	DragDropContext,
	Draggable,
	Droppable,
	DropResult,
} from 'react-beautiful-dnd';
import { DataSource } from 'types/common/queryBuilder';

import { WidgetGraphProps } from '../types';

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
	const [open, setOpen] = useState<boolean>(false);

	const initialDataSource = currentQuery.builder.queryData[0].dataSource;

	const { data, isLoading } = useGetAggregateKeys(
		{
			aggregateAttribute: '',
			dataSource: currentQuery.builder.queryData[0].dataSource,
			aggregateOperator: currentQuery.builder.queryData[0].aggregateOperator,
			searchText: '',
			tagType: '',
		},
		{
			queryKey: [
				currentQuery.builder.queryData[0].dataSource,
				currentQuery.builder.queryData[0].aggregateOperator,
			],
		},
	);

	const isAttributeKeySelected = (key: string): boolean => {
		if (initialDataSource === DataSource.LOGS && selectedLogFields) {
			return selectedLogFields.some((field) => field.name === key);
		}
		if (initialDataSource === DataSource.TRACES && selectedTracesFields) {
			return selectedTracesFields.some((field) => field.key === key);
		}
		return false;
	};

	const handleCheckboxChange = (key: string): void => {
		if (
			initialDataSource === DataSource.LOGS &&
			setSelectedLogFields !== undefined
		) {
			if (selectedLogFields) {
				if (isAttributeKeySelected(key)) {
					setSelectedLogFields(
						selectedLogFields.filter((field) => field.name !== key),
					);
				} else {
					setSelectedLogFields([
						...selectedLogFields,
						{ dataType: 'string', name: key, type: '' },
					]);
				}
			} else {
				setSelectedLogFields([{ dataType: 'string', name: key, type: '' }]);
			}
		} else if (
			initialDataSource === DataSource.TRACES &&
			setSelectedTracesFields !== undefined
		) {
			const selectedField = data?.payload?.attributeKeys?.find(
				(attributeKey) => attributeKey.key === key,
			);
			if (selectedTracesFields) {
				if (isAttributeKeySelected(key)) {
					setSelectedTracesFields(
						selectedTracesFields.filter((field) => field.key !== key),
					);
				} else if (selectedField) {
					setSelectedTracesFields([...selectedTracesFields, selectedField]);
				}
			} else if (selectedField) setSelectedTracesFields([selectedField]);
		}
		setOpen(false);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchText(e.target.value);
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
				<div className="attribute-columns">
					{data?.payload?.attributeKeys
						?.filter((attributeKey) =>
							attributeKey.key.toLowerCase().includes(searchText.toLowerCase()),
						)
						?.map((attributeKey) => (
							<Checkbox
								checked={isAttributeKeySelected(attributeKey.key)}
								onChange={(): void => handleCheckboxChange(attributeKey.key)}
								style={{ padding: 0 }}
								key={attributeKey.key}
							>
								{attributeKey.key}
							</Checkbox>
						))}
				</div>
			),
		},
	];

	// data?.payload?.attributeKeys
	// 	?.filter((attributeKey) =>
	// 		attributeKey.key.toLowerCase().includes(searchText.toLowerCase()),
	// 	)
	// 	?.map((attributeKey) => ({
	// 		key: attributeKey.key,
	// 		label: (
	// 			<Checkbox
	// 				checked={isAttributeKeySelected(attributeKey.key)}
	// 				onChange={(): void => handleCheckboxChange(attributeKey.key)}
	// 				style={{ padding: 0 }}
	// 			>
	// 				{attributeKey.key}
	// 			</Checkbox>
	// 		),
	// 	}));

	// // add search box to items at the beginning
	// items?.unshift({
	// 	key: 'search',
	// 	label: (
	// 		<Input
	// 			type="text"
	// 			placeholder="Search"
	// 			className="explorer-columns-search"
	// 			value={searchText}
	// 			onChange={handleSearchChange}
	// 			prefix={<Search size={16} style={{ padding: '6px' }} />}
	// 		/>
	// 	),
	// });

	const removeSelectedLogField = (name: string): void => {
		if (
			initialDataSource === DataSource.LOGS &&
			setSelectedLogFields &&
			selectedLogFields
		) {
			setSelectedLogFields(
				selectedLogFields.filter((field) => field.name !== name),
			);
		}
		if (
			initialDataSource === DataSource.TRACES &&
			setSelectedTracesFields &&
			selectedTracesFields
		) {
			setSelectedTracesFields(
				selectedTracesFields.filter((field) => field.key !== name),
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

	if (isLoading) {
		return <Spinner size="large" tip="Loading..." />;
	}

	return (
		<div className="explorer-columns-renderer">
			<Typography.Text>Columns</Typography.Text>
			<Divider />
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
									selectedLogFields.map((field, index) => (
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
														{field.name}
													</div>
													<Trash2
														style={{ cursor: 'pointer' }}
														size={12}
														color="red"
														onClick={(): void => removeSelectedLogField(field.name)}
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
														{field.key}
													</div>
													<Trash2
														size={12}
														color="red"
														onClick={(): void => removeSelectedLogField(field.key)}
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
						overlayStyle={{
							maxHeight: '200px',
							overflow: 'auto',
							padding: 0,
							margin: 0,
						}}
						open={open}
						overlayClassName="explorer-columns-dropdown"
					>
						<Button
							className="action-btn"
							icon={<PlusCircle size={16} />}
							onClick={toggleDropdown}
						/>
					</Dropdown>
				</div>
			</div>
		</div>
	);
}

export default ExplorerColumnsRenderer;

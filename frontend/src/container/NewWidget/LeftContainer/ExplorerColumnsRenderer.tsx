/* eslint-disable react/jsx-props-no-spreading */
import './ExplorerColumnsRenderer.styles.scss';

import { Button, Checkbox, Divider, Dropdown, Input, Typography } from 'antd';
import { MenuProps } from 'antd/lib';
import Spinner from 'components/Spinner';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GripVertical, PlusCircle, Trash2 } from 'lucide-react';
import {
	DragDropContext,
	Draggable,
	Droppable,
	DropResult,
} from 'react-beautiful-dnd';

import { WidgetGraphProps } from '../types';

type LogColumnsRendererProps = {
	setSelectedLogFields: WidgetGraphProps['setSelectedLogFields'];
	selectedLogFields: WidgetGraphProps['selectedLogFields'];
};

function ExplorerColumnsRenderer({
	selectedLogFields,
	setSelectedLogFields,
}: LogColumnsRendererProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

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
		if (selectedLogFields) {
			return selectedLogFields.some((field) => field.name === key);
		}
		return false;
	};

	const handleCheckboxChange = (key: string): void => {
		if (setSelectedLogFields === undefined) return;
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
	};

	const items: MenuProps['items'] = data?.payload?.attributeKeys?.map(
		(attributeKey) => ({
			key: attributeKey.key,
			label: (
				<Checkbox
					checked={isAttributeKeySelected(attributeKey.key)}
					onChange={(): void => handleCheckboxChange(attributeKey.key)}
				>
					{attributeKey.key}
				</Checkbox>
			),
		}),
	);

	// add search box to items at the beginning
	items?.unshift({
		key: 'search',
		label: <Input type="text" placeholder="Search" className="search-input" />,
	});

	const removeSelectedLogField = (name: string): void => {
		if (setSelectedLogFields && selectedLogFields) {
			setSelectedLogFields(
				selectedLogFields.filter((field) => field.name !== name),
			);
		}
	};

	const onDragEnd = (result: DropResult): void => {
		if (!result.destination) {
			return;
		}

		if (selectedLogFields && setSelectedLogFields) {
			const items = [...selectedLogFields];
			const [reorderedItem] = items.splice(result.source.index, 1);
			items.splice(result.destination.index, 0, reorderedItem);

			setSelectedLogFields(items);
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
								{selectedLogFields &&
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
														size={12}
														color="red"
														onClick={(): void => removeSelectedLogField(field.name)}
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
						placement="bottomLeft"
						arrow
						overlayStyle={{ maxHeight: '200px', overflow: 'auto' }}
					>
						<Button className="action-btn" icon={<PlusCircle size={16} />} />
					</Dropdown>
				</div>
			</div>
		</div>
	);
}

export default ExplorerColumnsRenderer;

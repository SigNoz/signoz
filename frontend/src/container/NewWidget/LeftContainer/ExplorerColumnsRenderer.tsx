/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
import './ExplorerColumnsRenderer.styles.scss';

import { closestCenter, DndContext, DragEndEvent } from '@dnd-kit/core';
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
} from '@dnd-kit/sortable';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	Checkbox,
	Divider,
	Dropdown,
	Input,
	Tooltip,
	Typography,
} from 'antd';
import { MenuProps } from 'antd/lib';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { AlertCircle, PlusCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { BaseAutocompleteDataWithId } from 'types/api/dashboard/getAll';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { WidgetGraphProps } from '../types';
import ExplorerCard from './ExplorerCard';

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

	const { data, isLoading, isError } = useGetAggregateKeys(
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
						{ id: uuid(), dataType: 'string', name: key, type: '' },
					]);
				}
			} else {
				setSelectedLogFields([
					{ id: uuid(), dataType: 'string', name: key, type: '' },
				]);
			}
		} else if (
			initialDataSource === DataSource.TRACES &&
			setSelectedTracesFields !== undefined
		) {
			const selectedField = data?.payload?.attributeKeys?.find(
				(attributeKey) => attributeKey.key === key,
			) as BaseAutocompleteDataWithId | undefined;
			if (selectedField && !selectedField?.id) {
				selectedField.id = uuid();
			}
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

	const removeExplorerCard = (name: string): void => {
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

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;

		if (
			initialDataSource === DataSource.LOGS &&
			selectedLogFields &&
			setSelectedLogFields
		) {
			if (!over) return;
			if (active.id === over.id) return;
			setSelectedLogFields((items) => {
				if (items) {
					const originIndex = items?.findIndex((item) => item.id === active.id);
					const targetIndex = items?.findIndex((item) => item.id === over.id);
					return arrayMove(items, originIndex, targetIndex);
				}
				return [];
			});
		}

		if (
			initialDataSource === DataSource.TRACES &&
			selectedTracesFields &&
			setSelectedTracesFields
		) {
			if (!over) return;
			if (active.id === over.id) return;
			setSelectedTracesFields((items) => {
				if (items) {
					const originPos = items?.findIndex((item) => item.id === active.id);
					const targetPos = items?.findIndex((item) => item.id === over.id);
					return arrayMove(items, originPos, targetPos);
				}
				return [];
			});
		}
	};

	const toggleDropdown = (): void => {
		setOpen(!open);
		if (!open) {
			setSearchText('');
		}
	};

	const isDarkMode = useIsDarkMode();

	if (isLoading) {
		return <Spinner size="large" tip="Loading..." height="4vh" />;
	}

	return (
		<div className="explorer-columns-renderer">
			<div className="title">
				<Typography.Text>Columns</Typography.Text>
				{isError && (
					<Tooltip title={SOMETHING_WENT_WRONG}>
						<AlertCircle size={16} />
					</Tooltip>
				)}
			</div>
			<Divider />
			{!isError && (
				<div className="explorer-columns-contents">
					<div className="explorer-columns">
						<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
							{initialDataSource === DataSource.LOGS && selectedLogFields && (
								<SortableContext
									items={selectedLogFields}
									strategy={horizontalListSortingStrategy}
								>
									{selectedLogFields.map((field) => (
										<ExplorerCard
											field={field}
											removeExplorerCard={removeExplorerCard}
											key={field.id}
										/>
									))}
								</SortableContext>
							)}
							{initialDataSource === DataSource.TRACES && selectedTracesFields && (
								<SortableContext
									items={selectedTracesFields}
									strategy={horizontalListSortingStrategy}
								>
									{selectedTracesFields.map((field) => (
										<ExplorerCard
											field={field}
											removeExplorerCard={removeExplorerCard}
											key={field.key}
										/>
									))}
								</SortableContext>
							)}
						</DndContext>
					</div>
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

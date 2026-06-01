import { Empty, Table } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import type { DashboardtypesVariableDTO } from 'api/generated/services/sigNoz.schemas';

import { getVariableKindLabel, getVariableName } from '../draft';
import TableRow from './TableRow';
import VariableRow from './VariableRow';

import '../../../../DashboardContainer/DashboardSettings/DashboardSettings.styles.scss';

interface TableEntry {
	key: string;
	name: string;
	description: string;
	kindLabel: string;
	index: number;
}

interface Props {
	variables: DashboardtypesVariableDTO[];
	onEdit: (index: number) => void;
	onDelete: (index: number) => void;
	onReorder: (next: DashboardtypesVariableDTO[]) => void;
}

function VariableList({
	variables,
	onEdit,
	onDelete,
	onReorder,
}: Props): JSX.Element {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 1 },
		}),
	);

	if (variables.length === 0) {
		return (
			<Empty
				image={Empty.PRESENTED_IMAGE_SIMPLE}
				description={
					<Typography.Text>
						No variables yet. Click &quot;Add variable&quot; to create one.
					</Typography.Text>
				}
			/>
		);
	}

	const dataSource: TableEntry[] = variables.map((v, idx) => ({
		key: getVariableName(v) || String(idx),
		name: getVariableName(v),
		description:
			(v.spec as { display?: { name?: string } })?.display?.name ?? '',
		kindLabel: getVariableKindLabel(v),
		index: idx,
	}));

	const columns = [
		{
			title: 'Variable',
			dataIndex: 'name',
			key: 'name',
			width: '50%',
		},
		{
			title: 'Description',
			key: 'description',
			width: '50%',
			render: (entry: TableEntry): JSX.Element => (
				<VariableRow
					description={entry.description}
					kindLabel={entry.kindLabel}
					onEdit={(): void => onEdit(entry.index)}
					onDelete={(): void => onDelete(entry.index)}
				/>
			),
		},
	];

	const onDragEnd = ({ active, over }: DragEndEvent): void => {
		if (!over || active.id === over.id) {return;}
		const fromIdx = dataSource.findIndex((d) => d.key === active.id);
		const toIdx = dataSource.findIndex((d) => d.key === over.id);
		if (fromIdx < 0 || toIdx < 0) {return;}
		onReorder(arrayMove(variables, fromIdx, toIdx));
	};

	return (
		<DndContext
			sensors={sensors}
			modifiers={[restrictToVerticalAxis]}
			onDragEnd={onDragEnd}
		>
			<SortableContext items={dataSource.map((d) => d.key)}>
				<Table
					components={{ body: { row: TableRow } }}
					rowKey="key"
					columns={columns}
					pagination={false}
					dataSource={dataSource}
					className="dashboard-variable-settings-table"
				/>
			</SortableContext>
		</DndContext>
	);
}

export default VariableList;

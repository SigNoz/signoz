import { useMemo } from 'react';
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesPanelSpecDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import AddColumnDropdown from './components/AddColumnDropdown/AddColumnDropdown';
import SortableColumnChip from './components/SortableColumnChip/SortableColumnChip';
import { readSelectFields, writeSelectFields } from './selectFields';
import styles from './ListColumnsEditor.module.scss';

interface ListColumnsEditorProps {
	spec: DashboardtypesPanelSpecDTO;
	onChangeSpec: (next: DashboardtypesPanelSpecDTO) => void;
	signal: TelemetrytypesSignalDTO;
}

/**
 * The List panel's columns control, rendered below the query builder (V1 parity).
 * Columns are `spec.plugin.spec.selectFields`, shown as draggable chips that can
 * be reordered, removed, or added from a field-search dropdown. Empty means the
 * renderer shows every field the query returns.
 */
function ListColumnsEditor({
	spec,
	onChangeSpec,
	signal,
}: ListColumnsEditorProps): JSX.Element {
	const fields = useMemo(() => readSelectFields(spec), [spec]);
	const names = useMemo(() => fields.map((field) => field.name), [fields]);
	const selectedNames = useMemo(() => new Set(names), [names]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const commit = (next: TelemetrytypesTelemetryFieldKeyDTO[]): void =>
		onChangeSpec(writeSelectFields(spec, next));

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = names.indexOf(active.id as string);
		const newIndex = names.indexOf(over.id as string);
		if (oldIndex === -1 || newIndex === -1) {
			return;
		}
		commit(arrayMove(fields, oldIndex, newIndex));
	};

	const handleRemove = (name: string): void =>
		commit(fields.filter((field) => field.name !== name));

	const handleToggle = (field: TelemetrytypesTelemetryFieldKeyDTO): void => {
		if (selectedNames.has(field.name)) {
			handleRemove(field.name);
			return;
		}
		commit([...fields, field]);
	};

	return (
		<div className={styles.editor} data-testid="list-columns-editor">
			<div className={styles.header}>
				<Typography
					variant="paragraph"
					size="small"
					weight="medium"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Columns
				</Typography>
			</div>
			<div className={styles.body}>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext items={names} strategy={horizontalListSortingStrategy}>
						<div className={styles.chips}>
							{fields.map((field) => (
								<SortableColumnChip
									key={field.name}
									id={field.name}
									name={field.name}
									onRemove={handleRemove}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
				<AddColumnDropdown
					signal={signal}
					selectedNames={selectedNames}
					onToggle={handleToggle}
				/>
			</div>
			{fields.length === 0 && (
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="tertiary"
					as="span"
					textOverflow="wrap"
				>
					Leave empty to show all fields returned by the query.
				</Typography>
			)}
		</div>
	);
}

export default ListColumnsEditor;

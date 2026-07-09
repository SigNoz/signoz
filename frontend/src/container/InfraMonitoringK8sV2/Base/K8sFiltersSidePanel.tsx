import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import {
	hideColumn,
	showColumn,
	TableColumnDef,
	useHiddenColumnIds,
} from 'components/TanStackTableView';

import styles from './K8sFiltersSidePanel.module.scss';

type ColumnPickerItem = {
	id: string;
	label: string;
	canBeHidden: boolean;
	visibilityBehavior:
		| 'hidden-on-expand'
		| 'hidden-on-collapse'
		| 'always-visible';
};

/**
 * Converts TableColumnDef to column picker item format
 */
function toColumnPickerItems<T>(
	columns: TableColumnDef<T>[],
): ColumnPickerItem[] {
	return columns.map((col) => ({
		id: col.id,
		label: typeof col.header === 'string' ? col.header : col.id,
		canBeHidden: col.canBeHidden !== false && col.enableRemove !== false,
		visibilityBehavior: col.visibilityBehavior ?? 'always-visible',
	}));
}

function K8sFiltersSidePanel<TData>({
	open,
	onClose,
	columns,
	storageKey,
}: {
	open: boolean;
	onClose: () => void;
	columns: TableColumnDef<TData>[];
	storageKey: string;
}): JSX.Element {
	const columnPickerItems = useMemo(
		() => toColumnPickerItems(columns),
		[columns],
	);
	const hiddenColumnIds = useHiddenColumnIds(storageKey);

	const addedColumns = useMemo(
		() =>
			columnPickerItems.filter(
				(column) =>
					!hiddenColumnIds.includes(column.id) &&
					column.visibilityBehavior !== 'hidden-on-collapse',
			),
		[columnPickerItems, hiddenColumnIds],
	);

	const hiddenColumns = useMemo(
		() =>
			columnPickerItems.filter((column) => hiddenColumnIds.includes(column.id)),
		[columnPickerItems, hiddenColumnIds],
	);

	const handleRemoveColumn = (columnId: string): void => {
		hideColumn(storageKey, columnId);
	};

	const handleAddColumn = (columnId: string): void => {
		showColumn(storageKey, columnId);
	};

	const drawerContent = (
		<>
			<div className={styles.columnsTitle}>Added Columns (Click to remove)</div>

			<div className={styles.columnsList}>
				{addedColumns.map((column) => (
					<div className={styles.columnItem} key={column.id}>
						<Button
							variant="ghost"
							color="none"
							className={styles.columnItem}
							disabled={!column.canBeHidden}
							data-testid={`remove-column-${column.id}`}
							onClick={(): void => handleRemoveColumn(column.id)}
						>
							{column.label}
						</Button>
					</div>
				))}
			</div>

			<div className={styles.horizontalDivider} />

			<div className={styles.columnsTitle}>Other Columns (Click to add)</div>

			<div className={styles.columnsList}>
				{hiddenColumns.map((column) => (
					<div className={styles.columnItem} key={column.id}>
						<Button
							variant="ghost"
							color="none"
							className={styles.columnItem}
							data-can-be-added="true"
							data-testid={`add-column-${column.id}`}
							onClick={(): void => handleAddColumn(column.id)}
							tabIndex={0}
						>
							{column.label}
						</Button>
					</div>
				))}
			</div>
		</>
	);

	return (
		<DrawerWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="Columns"
			direction="right"
			showCloseButton
			showOverlay={false}
			className={styles.drawer}
		>
			{drawerContent}
		</DrawerWrapper>
	);
}

export default K8sFiltersSidePanel;

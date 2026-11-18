import { useMemo } from 'react';
import { Columns3 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';
import styles from './ColumnSelector.module.scss';
import type { TableColumnDef } from './types';
import { hideColumn, showColumn, useHiddenColumnIds } from './useColumnStore';

interface ColumnSelectorProps<TData> {
	columns: TableColumnDef<TData>[];
	/** Shared with the table's `columnStorageKey`, which is what it writes to. */
	storageKey: string;
	testId?: string;
}

function ColumnSelector<TData>({
	columns,
	storageKey,
	testId = 'column-selector-button',
}: ColumnSelectorProps<TData>): JSX.Element {
	const hiddenColumnIds = useHiddenColumnIds(storageKey);

	const selectableColumns = useMemo(
		() =>
			columns.filter(
				(col) => col.canBeHidden !== false && col.enableRemove !== false,
			),
		[columns],
	);

	const handleToggle = (columnId: string, checked: boolean): void => {
		if (checked) {
			showColumn(storageKey, columnId);
		} else {
			hideColumn(storageKey, columnId);
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outlined"
					size="sm"
					color="secondary"
					prefix={<Columns3 size={14} />}
					testId={testId}
				>
					Columns
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className={styles.popoverContent}>
				<div className={styles.title}>Toggle Columns</div>
				<div className={styles.columnList}>
					{selectableColumns.map((col) => {
						const isVisible = !hiddenColumnIds.includes(col.id);
						const label = typeof col.header === 'string' ? col.header : col.id;

						return (
							<label key={col.id} className={styles.columnItem}>
								<Checkbox
									color="primary"
									id={`col-${col.id}`}
									value={isVisible}
									onChange={(): void => handleToggle(col.id, !isVisible)}
								/>
								<span>{label}</span>
							</label>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

ColumnSelector.defaultProps = {
	testId: 'column-selector-button',
};

export default ColumnSelector;

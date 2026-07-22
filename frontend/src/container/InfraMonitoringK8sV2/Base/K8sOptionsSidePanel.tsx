import { ChangeEvent, ReactNode, useCallback, useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Check, Minus, Plus } from '@signozhq/icons';
import {
	hideColumn,
	showColumn,
	TableColumnDef,
	useHiddenColumnIds,
} from 'components/TanStackTableView';

import {
	FontSize,
	useInfraMonitoringTablePreferencesStore,
} from './useInfraMonitoringTablePreferencesStore';

import styles from './K8sOptionsSidePanel.module.scss';
import { Typography } from '@signozhq/ui/typography';

type ColumnPickerItem = {
	id: string;
	label: ReactNode;
	canBeHidden: boolean;
	visibilityBehavior:
		| 'hidden-on-expand'
		| 'hidden-on-collapse'
		| 'always-visible';
};

function renderHeader(header: string | (() => ReactNode)): ReactNode {
	return typeof header === 'function' ? header() : header;
}

function toColumnPickerItems<T>(
	columns: TableColumnDef<T>[],
): ColumnPickerItem[] {
	return columns.map((col) => ({
		id: col.id,
		label: renderHeader(col.header),
		canBeHidden: col.canBeHidden !== false && col.enableRemove !== false,
		visibilityBehavior: col.visibilityBehavior ?? 'always-visible',
	}));
}

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
	{ value: 'small', label: 'Small' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large', label: 'Large' },
];

function K8sOptionsSidePanel<TData>({
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

	const lineClamp = useInfraMonitoringTablePreferencesStore((s) => s.lineClamp);
	const fontSize = useInfraMonitoringTablePreferencesStore((s) => s.fontSize);
	const increaseLineClamp = useInfraMonitoringTablePreferencesStore(
		(s) => s.increaseLineClamp,
	);
	const decreaseLineClamp = useInfraMonitoringTablePreferencesStore(
		(s) => s.decreaseLineClamp,
	);
	const setLineClamp = useInfraMonitoringTablePreferencesStore(
		(s) => s.setLineClamp,
	);
	const setFontSize = useInfraMonitoringTablePreferencesStore(
		(s) => s.setFontSize,
	);

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

	const handleLineClampChange = useCallback(
		(value: ChangeEvent<HTMLInputElement>): void => {
			const valueAsNumber = value.target.valueAsNumber;

			if (value && Number.isInteger(valueAsNumber)) {
				setLineClamp(valueAsNumber);
			}
		},
		[setLineClamp],
	);

	const drawerContent = (
		<>
			<div className={styles.sectionTitle}>
				<Typography.Text size="sm" className={styles.sectionTitleText}>
					Font Size
				</Typography.Text>
			</div>
			<div className={styles.fontSizeContainer}>
				{FONT_SIZE_OPTIONS.map((option) => (
					<Button
						key={option.value}
						variant="ghost"
						color="none"
						className={styles.fontSizeOption}
						data-testid={`font-size-${option.value}`}
						onClick={(): void => setFontSize(option.value)}
					>
						{option.label}
						{fontSize === option.value && (
							<Check size={14} className={styles.checkIcon} />
						)}
					</Button>
				))}
			</div>

			<div className={styles.horizontalDivider} />

			<div className={styles.sectionTitle}>
				<Typography.Text size="sm" className={styles.sectionTitleText}>
					Max lines per row
				</Typography.Text>
			</div>
			<div className={styles.lineClampContainer}>
				<Input
					min={1}
					max={10}
					value={lineClamp}
					onChange={handleLineClampChange}
					data-testid="line-clamp-input"
					type="number"
					prefix={
						<Button
							variant="solid"
							color="primary"
							size="sm"
							className={styles.lineClampButton}
							data-testid="line-clamp-decrease"
							onClick={decreaseLineClamp}
							prefix={<Minus />}
							disabled={lineClamp <= 1}
						/>
					}
					suffix={
						<Button
							variant="solid"
							color="primary"
							size="sm"
							className={styles.lineClampButton}
							data-testid="line-clamp-increase"
							onClick={increaseLineClamp}
							prefix={<Plus />}
							disabled={lineClamp >= 10}
						/>
					}
				/>
			</div>

			<div className={styles.horizontalDivider} />

			<div className={styles.sectionTitle}>
				<Typography.Text size="sm" className={styles.sectionTitleText}>
					Added Columns (Click to remove)
				</Typography.Text>
			</div>
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

			<div className={styles.sectionTitle}>
				<Typography.Text size="sm" className={styles.sectionTitleText}>
					Other Columns (Click to add)
				</Typography.Text>
			</div>
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
			title="Options"
			direction="right"
			width="narrow"
			showCloseButton
			showOverlay={false}
			className={styles.drawer}
		>
			{drawerContent}
		</DrawerWrapper>
	);
}

export default K8sOptionsSidePanel;

import { ChangeEvent, ReactNode, useCallback, useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Switch } from '@signozhq/ui/switch';
import { TooltipSimple } from '@signozhq/ui/tooltip';
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

	const visibleColumnItems = useMemo(
		() =>
			columnPickerItems.filter(
				(column) => column.visibilityBehavior !== 'hidden-on-collapse',
			),
		[columnPickerItems],
	);

	const handleToggleColumn = (columnId: string, checked: boolean): void => {
		if (checked) {
			showColumn(storageKey, columnId);
		} else {
			hideColumn(storageKey, columnId);
		}
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
					Columns
				</Typography.Text>
			</div>
			<div className={styles.columnsList}>
				{visibleColumnItems.map((column) => {
					const isVisible = !hiddenColumnIds.includes(column.id);
					const switchElement = (
						<Switch
							value={isVisible}
							disabled={!column.canBeHidden}
							data-testid={`toggle-column-${column.id}`}
							onChange={(checked): void => handleToggleColumn(column.id, checked)}
						/>
					);
					return (
						<div className={styles.columnItem} key={column.id}>
							<Typography.Text size="sm" className={styles.columnLabel}>
								{column.label}
							</Typography.Text>
							{column.canBeHidden ? (
								switchElement
							) : (
								<TooltipSimple title="Required column cannot be hidden" arrow>
									{switchElement}
								</TooltipSimple>
							)}
						</div>
					);
				})}
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

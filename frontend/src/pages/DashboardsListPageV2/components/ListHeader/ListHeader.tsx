// eslint-disable-next-line signoz/no-antd-components -- Popover/Tooltip not yet migrated for this menu
import { Popover, Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { ArrowDown, ArrowUp, Check, Columns3 } from '@signozhq/icons';

import logEvent from 'api/common/logEvent';
import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';

import {
	type DashboardDynamicColumns,
	useDashboardsListVisibleColumnsStore,
} from '../../store/useVisibleColumnsStore';

import styles from './ListHeader.module.scss';

interface Props {
	sortColumn: DashboardtypesListSortDTO;
	onSortChange: (column: DashboardtypesListSortDTO) => void;
	sortOrder: DashboardtypesListOrderDTO;
	onOrderChange: (order: DashboardtypesListOrderDTO) => void;
}

const SORT_LABELS: Record<DashboardtypesListSortDTO, string> = {
	[DashboardtypesListSortDTO.updated_at]: 'Last updated',
	[DashboardtypesListSortDTO.created_at]: 'Last created',
	[DashboardtypesListSortDTO.name]: 'Name',
};

// Created-at / created-by are always shown; only the "updated" columns toggle.
const METADATA_COLUMNS: {
	key: keyof DashboardDynamicColumns;
	label: string;
}[] = [
	{ key: 'updatedAt', label: 'Updated at' },
	{ key: 'updatedBy', label: 'Updated by' },
];

function ListHeader({
	sortColumn,
	onSortChange,
	sortOrder,
	onOrderChange,
}: Props): JSX.Element {
	const visibleColumns = useDashboardsListVisibleColumnsStore(
		(s) => s.visibleColumns,
	);
	const setVisibleColumns = useDashboardsListVisibleColumnsStore(
		(s) => s.setVisibleColumns,
	);

	const metadataContent = (
		<div className={styles.metaPanel}>
			<Typography.Text className={styles.sortHeading}>Columns</Typography.Text>
			{METADATA_COLUMNS.map((col) => (
				<div key={col.key} className={styles.metaRow}>
					<Typography.Text className={styles.metaLabel}>{col.label}</Typography.Text>
					<Switch
						value={visibleColumns[col.key]}
						testId={`metadata-toggle-${col.key}`}
						onChange={(checked): void => {
							void logEvent(DashboardListEvents.ColumnsToggled, {
								column: col.key,
								visible: checked,
							});
							setVisibleColumns({ ...visibleColumns, [col.key]: checked });
						}}
					/>
				</div>
			))}
		</div>
	);

	return (
		<div className={styles.wrapper}>
			<Typography.Text className={styles.label}>Results</Typography.Text>
			<section className={styles.rightActions}>
				<Popover
					trigger="click"
					content={
						<div className={styles.sortContent}>
							<Typography.Text className={styles.sortHeading}>Sort By</Typography.Text>
							<Button
								variant="ghost"
								color="secondary"
								className={styles.sortButton}
								onClick={(): void => onSortChange(DashboardtypesListSortDTO.name)}
								testId="sort-by-name"
								suffix={
									sortColumn === DashboardtypesListSortDTO.name ? (
										<Check size={14} />
									) : undefined
								}
							>
								Name
							</Button>
							<Button
								variant="ghost"
								color="secondary"
								className={styles.sortButton}
								onClick={(): void => onSortChange(DashboardtypesListSortDTO.created_at)}
								testId="sort-by-last-created"
								suffix={
									sortColumn === DashboardtypesListSortDTO.created_at ? (
										<Check size={14} />
									) : undefined
								}
							>
								Last created
							</Button>
							<Button
								variant="ghost"
								color="secondary"
								className={styles.sortButton}
								onClick={(): void => onSortChange(DashboardtypesListSortDTO.updated_at)}
								testId="sort-by-last-updated"
								suffix={
									sortColumn === DashboardtypesListSortDTO.updated_at ? (
										<Check size={14} />
									) : undefined
								}
							>
								Last updated
							</Button>
							<div className={styles.sortDivider} />
							<Typography.Text className={styles.sortHeading}>Order</Typography.Text>
							<Button
								variant="ghost"
								color="secondary"
								className={styles.sortButton}
								onClick={(): void => onOrderChange(DashboardtypesListOrderDTO.asc)}
								testId="sort-order-asc"
								suffix={
									sortOrder === DashboardtypesListOrderDTO.asc ? (
										<Check size={14} />
									) : undefined
								}
							>
								Ascending
							</Button>
							<Button
								variant="ghost"
								color="secondary"
								className={styles.sortButton}
								onClick={(): void => onOrderChange(DashboardtypesListOrderDTO.desc)}
								testId="sort-order-desc"
								suffix={
									sortOrder === DashboardtypesListOrderDTO.desc ? (
										<Check size={14} />
									) : undefined
								}
							>
								Descending
							</Button>
						</div>
					}
					rootClassName="sortDashboardsPopover"
					placement="bottomRight"
					arrow={false}
				>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						testId="sort-by"
						aria-label="Sort"
						suffix={
							sortOrder === DashboardtypesListOrderDTO.asc ? (
								<ArrowUp size={12} />
							) : (
								<ArrowDown size={12} />
							)
						}
					>
						<Typography.Text className={styles.sortPrefix}>Sort:</Typography.Text>{' '}
						{SORT_LABELS[sortColumn]}{' '}
					</Button>
				</Popover>

				<Popover
					trigger="click"
					content={metadataContent}
					rootClassName="configureGroupPopover"
					placement="bottomRight"
					arrow={false}
				>
					<Tooltip title="Columns">
						<Button
							variant="ghost"
							color="secondary"
							size="icon"
							aria-label="Columns"
							testId="configure-columns-trigger"
						>
							<Columns3 size={14} />
						</Button>
					</Tooltip>
				</Popover>
			</section>
		</div>
	);
}

export default ListHeader;

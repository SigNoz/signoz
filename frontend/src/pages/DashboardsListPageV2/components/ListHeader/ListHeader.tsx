import { Button, Popover, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import {
	ArrowDownWideNarrow,
	Check,
	Ellipsis,
	HdmiPort,
} from '@signozhq/icons';

import type {
	SortColumn,
	SortOrder,
} from '../../hooks/useDashboardsListQueryParams';

import styles from './ListHeader.module.scss';

interface Props {
	sortColumn: SortColumn;
	onSortChange: (column: SortColumn) => void;
	sortOrder: SortOrder;
	onOrderChange: (order: SortOrder) => void;
	onConfigureMetadata: () => void;
}

function ListHeader({
	sortColumn,
	onSortChange,
	sortOrder,
	onOrderChange,
	onConfigureMetadata,
}: Props): JSX.Element {
	return (
		<div className={styles.wrapper}>
			<Typography.Text className={styles.label}>All Dashboards</Typography.Text>
			<section className={styles.rightActions}>
				<Tooltip title="Sort">
					<Popover
						trigger="click"
						content={
							<div className={styles.sortContent}>
								<Typography.Text className={styles.sortHeading}>
									Sort By
								</Typography.Text>
								<Button
									type="text"
									className={styles.sortButton}
									onClick={(): void => onSortChange('name')}
									data-testid="sort-by-name"
								>
									Name
									{sortColumn === 'name' && <Check size={14} />}
								</Button>
								<Button
									type="text"
									className={styles.sortButton}
									onClick={(): void => onSortChange('created_at')}
									data-testid="sort-by-last-created"
								>
									Last created
									{sortColumn === 'created_at' && <Check size={14} />}
								</Button>
								<Button
									type="text"
									className={styles.sortButton}
									onClick={(): void => onSortChange('updated_at')}
									data-testid="sort-by-last-updated"
								>
									Last updated
									{sortColumn === 'updated_at' && <Check size={14} />}
								</Button>
								<div className={styles.sortDivider} />
								<Typography.Text className={styles.sortHeading}>Order</Typography.Text>
								<Button
									type="text"
									className={styles.sortButton}
									onClick={(): void => onOrderChange('asc')}
									data-testid="sort-order-asc"
								>
									Ascending
									{sortOrder === 'asc' && <Check size={14} />}
								</Button>
								<Button
									type="text"
									className={styles.sortButton}
									onClick={(): void => onOrderChange('desc')}
									data-testid="sort-order-desc"
								>
									Descending
									{sortOrder === 'desc' && <Check size={14} />}
								</Button>
							</div>
						}
						rootClassName="sortDashboardsPopover"
						placement="bottomRight"
						arrow={false}
					>
						<button
							type="button"
							className={styles.iconTrigger}
							data-testid="sort-by"
							aria-label="Sort"
						>
							<ArrowDownWideNarrow size={14} />
						</button>
					</Popover>
				</Tooltip>
				<Popover
					trigger="click"
					content={
						<div className={styles.configureContent}>
							<button
								type="button"
								className={styles.configureItem}
								onClick={(e): void => {
									e.preventDefault();
									e.stopPropagation();
									onConfigureMetadata();
								}}
								data-testid="configure-metadata-trigger"
							>
								<span className={styles.configureIcon}>
									<HdmiPort size={14} />
								</span>
								<span>Configure metadata</span>
							</button>
						</div>
					}
					rootClassName="configureGroupPopover"
					placement="bottomRight"
					arrow={false}
				>
					<button
						type="button"
						className={styles.iconTrigger}
						aria-label="More options"
					>
						<Ellipsis size={14} />
					</button>
				</Popover>
			</section>
		</div>
	);
}

export default ListHeader;

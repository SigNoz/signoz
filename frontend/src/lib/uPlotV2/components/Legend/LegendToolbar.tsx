import { ChangeEvent, useCallback } from 'react';
import { Input } from 'antd';
import { Search } from '@signozhq/icons';

import styles from './Legend.module.scss';

export interface LegendToolbarProps {
	visibleCount: number;
	totalCount: number;
	/** Search is intrinsic to the right-positioned legend. */
	showFilter: boolean;
	filterQuery: string;
	onFilterQueryChange: (query: string) => void;
}

/** Legend chrome: the series search box and the "Showing N of M" readout. */
export default function LegendToolbar({
	visibleCount,
	totalCount,
	showFilter,
	filterQuery,
	onFilterQueryChange,
}: LegendToolbarProps): JSX.Element {
	const handleFilterChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>): void =>
			onFilterQueryChange(event.target.value),
		[onFilterQueryChange],
	);

	return (
		<>
			{showFilter && (
				<div className={styles.searchContainer}>
					<Input
						allowClear
						prefix={<Search size={12} className={styles.searchIcon} />}
						placeholder="Search..."
						value={filterQuery}
						onChange={handleFilterChange}
						className={styles.searchInput}
						data-testid="legend-search-input"
					/>
				</div>
			)}
			<div className={styles.toolbar}>
				<span
					className={styles.status}
					aria-live="polite"
					data-testid="legend-status"
				>
					{`Showing ${visibleCount} of ${totalCount} series`}
				</span>
			</div>
		</>
	);
}

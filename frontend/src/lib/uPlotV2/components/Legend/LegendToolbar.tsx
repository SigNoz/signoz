import { ChangeEvent, useCallback } from 'react';
import cx from 'classnames';
import { Input } from 'antd';
import { Search } from '@signozhq/icons';

import { LegendPosition } from '../types';

import styles from './LegendToolbar.module.scss';

export interface LegendToolbarProps {
	visibleCount: number;
	totalCount: number;
	/** Layout only: the column stacks, the bottom row does not. */
	position: LegendPosition;
	filterQuery: string;
	onFilterQueryChange: (query: string) => void;
}

/** Legend chrome: the series search box and the "Showing N of M" readout. */
export default function LegendToolbar({
	visibleCount,
	totalCount,
	position,
	filterQuery,
	onFilterQueryChange,
}: LegendToolbarProps): JSX.Element {
	const handleFilterChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>): void =>
			onFilterQueryChange(event.target.value),
		[onFilterQueryChange],
	);

	const searchProps = {
		allowClear: true,
		prefix: <Search size={12} className={styles.searchIcon} />,
		placeholder: 'Search...',
		value: filterQuery,
		onChange: handleFilterChange,
		className: styles.searchInput,
		'data-testid': 'legend-search-input',
	};

	const status = (
		<span
			className={cx(styles.status, {
				[styles.statusInline]: position !== LegendPosition.RIGHT,
			})}
			aria-live="polite"
			data-testid="legend-status"
		>
			{`Showing ${visibleCount} of ${totalCount} series`}
		</span>
	);

	if (position === LegendPosition.RIGHT) {
		return (
			<>
				<div className={styles.searchContainer}>
					<Input {...searchProps} />
				</div>
				<div className={styles.toolbar}>{status}</div>
			</>
		);
	}

	return (
		<div className={styles.inlineToolbar}>
			<div className={styles.search}>
				<Input
					{...searchProps}
					className={cx(styles.searchInput, styles.searchInputInline)}
				/>
			</div>
			{status}
		</div>
	);
}

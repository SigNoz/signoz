import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { X } from '@signozhq/icons';

import type { UpdatedWindow } from '../../types';
import SearchBar from '../SearchBar/SearchBar';
import FilterChips, { type CreatorOption } from './FilterChips';

import styles from './FilterZone.module.scss';

interface Props {
	search: string;
	createdBy: string[];
	updated: UpdatedWindow;
	creatorOptions: CreatorOption[];
	isEmpty: boolean;
	onSearchChange: (value: string) => void;
	onCreatedByChange: (emails: string[]) => void;
	onUpdatedChange: (window: UpdatedWindow) => void;
	onClearAll: () => void;
	// Rendered at the end of the search row (e.g. the New Dashboard action).
	rightSlot?: ReactNode;
}

// The filter command zone: name search + structured chips (created-by, updated)
// + clear-all. Search is committed on submit/blur (matching the prior bar);
// chips apply immediately.
function FilterZone({
	search,
	createdBy,
	updated,
	creatorOptions,
	isEmpty,
	onSearchChange,
	onCreatedByChange,
	onUpdatedChange,
	onClearAll,
	rightSlot,
}: Props): JSX.Element {
	const [searchInput, setSearchInput] = useState(search);

	// Keep the local input in sync with external search changes (applying a view,
	// clear-all, back/forward). User typing only mutates the local copy.
	useEffect(() => {
		setSearchInput(search);
	}, [search]);

	const handleSubmit = useCallback((): void => {
		const next = searchInput.trim();
		if (next !== search) {
			onSearchChange(next);
		}
	}, [searchInput, search, onSearchChange]);

	return (
		<div className={styles.filterZone}>
			<div className={styles.searchRow}>
				<div className={styles.searchInput}>
					<SearchBar
						value={searchInput}
						placeholder="Search dashboards by name"
						onChange={setSearchInput}
						onSubmit={handleSubmit}
					/>
				</div>
				{rightSlot}
			</div>
			<div className={styles.filtersRow}>
				<span className={styles.filtersLabel}>Filters</span>
				<FilterChips
					createdBy={createdBy}
					updated={updated}
					creatorOptions={creatorOptions}
					onCreatedByChange={onCreatedByChange}
					onUpdatedChange={onUpdatedChange}
				/>
				{!isEmpty && (
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						prefix={<X size={12} />}
						onClick={onClearAll}
						testId="dashboards-filter-clear"
					>
						Clear
					</Button>
				)}
			</div>
		</div>
	);
}

export default FilterZone;

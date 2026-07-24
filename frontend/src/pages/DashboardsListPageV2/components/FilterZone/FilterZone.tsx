import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { X } from '@signozhq/icons';

import type { SuggestionSource } from '../../utils/dslSuggestions';
import {
	createdByClause,
	parseReflectedClauses,
	spliceClause,
	updatedClause,
} from '../../utils/filterQuery';
import type { UpdatedWindow } from '../../types';
import SearchBar from '../SearchBar/SearchBar';
import FilterChips, { type CreatorOption } from './FilterChips';

import styles from './FilterZone.module.scss';

interface Props {
	// The last-run query (source of truth for fetching + the dirty baseline).
	query: string;
	creatorOptions: CreatorOption[];
	source: SuggestionSource;
	// Commit (run) the draft — the only path that triggers a fetch.
	onQueryChange: (value: string) => void;
	// Rendered at the end of the search row (e.g. the New Dashboard action).
	rightSlot?: ReactNode;
}

// The filter command zone. The query box is a DRAFT: typing and the Created-by /
// Updated dropdowns all edit the draft (dropdowns splice their clause in); nothing
// fetches until the draft is run (Cmd/Ctrl+Enter or the Run button). A dirty dot
// signals unrun changes. The draft re-syncs when the last-run query changes
// externally (view select, back/forward).
function FilterZone({
	query,
	creatorOptions,
	source,
	onQueryChange,
	rightSlot,
}: Props): JSX.Element {
	const [draft, setDraft] = useState(query);

	useEffect(() => {
		setDraft(query);
	}, [query]);

	const reflected = useMemo(() => parseReflectedClauses(draft), [draft]);
	const dirty = draft.trim() !== query.trim();
	const isEmpty = !draft.trim();

	const run = useCallback((): void => {
		const next = draft.trim();
		if (next !== query) {
			onQueryChange(next);
		}
	}, [draft, query, onQueryChange]);

	// Created-by (multi-select) only STAGES its clause into the draft; the query runs
	// when the dropdown closes (FilterChips fires onApply), not on each pick.
	const handleCreatedByChange = useCallback((emails: string[]): void => {
		setDraft((d) => spliceClause(d, 'created_by', createdByClause(emails)));
	}, []);

	// Updated (single-select) is a definitive single choice, so it splices AND runs
	// immediately (with the fresh value, avoiding the async draft-state lag).
	const handleUpdatedChange = useCallback(
		(window: UpdatedWindow): void => {
			const next = spliceClause(draft, 'updated_at', updatedClause(window));
			setDraft(next);
			const trimmed = next.trim();
			if (trimmed !== query) {
				onQueryChange(trimmed);
			}
		},
		[draft, query, onQueryChange],
	);

	// Clear-all on the Created-by select removes its clause and runs immediately.
	const handleClearCreatedBy = useCallback((): void => {
		const next = spliceClause(draft, 'created_by', null);
		setDraft(next);
		const trimmed = next.trim();
		if (trimmed !== query) {
			onQueryChange(trimmed);
		}
	}, [draft, query, onQueryChange]);

	// Clear resets the draft and runs immediately (empty query).
	const handleClear = useCallback((): void => {
		setDraft('');
		if (query !== '') {
			onQueryChange('');
		}
	}, [query, onQueryChange]);

	return (
		<div className={styles.filterZone}>
			<div className={styles.searchRow}>
				<div className={styles.searchInput}>
					<SearchBar
						value={draft}
						placeholder="DSL Filter — e.g. name CONTAINS 'api' AND env IN ['prod','staging']"
						source={source}
						dirty={dirty}
						onChange={setDraft}
						onSubmit={run}
					/>
				</div>
				{rightSlot}
			</div>
			<div className={styles.filtersRow}>
				<Typography.Text className={styles.filtersLabel}>Filters</Typography.Text>
				<FilterChips
					createdBy={reflected.createdBy}
					updated={reflected.updated}
					creatorOptions={creatorOptions}
					onCreatedByChange={handleCreatedByChange}
					onUpdatedChange={handleUpdatedChange}
					onApply={run}
					onClearCreatedBy={handleClearCreatedBy}
				/>
				{!isEmpty && (
					<Button
						variant="outlined"
						color="primary"
						size="sm"
						prefix={<X size={12} />}
						onClick={handleClear}
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

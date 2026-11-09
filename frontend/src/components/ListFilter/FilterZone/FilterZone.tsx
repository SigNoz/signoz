import type { ReactElement, ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { X } from '@signozhq/icons';

import type { DslGrammar, SuggestionSource } from '../dsl/types';
import SearchBar from '../SearchBar/SearchBar';
import type {
	CreatorOption,
	FilterAppliedPayload,
	FilterAppliedType,
} from '../types';
import FilterChips from './FilterChips';
import { useFilterZoneDraft } from './useFilterZoneDraft';

import styles from './FilterZone.module.scss';

interface Props {
	// The last-run query (source of truth for fetching + the dirty baseline).
	query: string;
	grammar: DslGrammar;
	// Ids: `${testIdPrefix}-search-zone`, `-list-search*`, `-filter-zone`,
	// `-filter-clear`, `-filter-created-by`, `-filter-updated`, `-query-error`.
	testIdPrefix: string;
	creatorOptions: CreatorOption[];
	source: SuggestionSource;
	// Commit (run) the draft — the only path that triggers a fetch.
	onQueryChange: (value: string) => void;
	placeholder?: string;
	// Rendered at the end of the search row (e.g. the New Dashboard action).
	rightSlot?: ReactNode;
	// Rendered in the filters row after the chips.
	extraFilters?: ReactNode;
	// Shows Clear even when the query is empty.
	hasExtraFilters?: boolean;
	// Called by Clear after it empties the query.
	onClearAll?: () => void;
	// Shown under the search row.
	error?: string;
	// Wraps the search box and the filter controls (e.g. in an authz tooltip).
	wrapControl?: (node: ReactElement) => ReactElement;
	onSubmitted?: (hasQuery: boolean) => void;
	onFilterApplied?: (
		filterType: FilterAppliedType,
		payload: FilterAppliedPayload,
	) => void;
	onCleared?: () => void;
	/** Filtering needs `list`: the box and chips edit a query that cannot be run. */
	disabled?: boolean;
}

const identity = (node: ReactElement): ReactElement => node;

// The filter command zone: a draft DSL query box (run with Cmd/Ctrl+Enter or the
// Run button; a dirty dot signals unrun changes) plus Created-by / Updated chips.
function FilterZone({
	query,
	grammar,
	testIdPrefix,
	creatorOptions,
	source,
	onQueryChange,
	placeholder,
	rightSlot,
	extraFilters,
	hasExtraFilters = false,
	onClearAll,
	error,
	wrapControl = identity,
	onSubmitted,
	onFilterApplied,
	onCleared,
	disabled = false,
}: Props): JSX.Element {
	const {
		draft,
		setDraft,
		reflected,
		dirty,
		isEmpty,
		run,
		handleCreatedByChange,
		handleUpdatedChange,
		handleClearCreatedBy,
		handleClear,
	} = useFilterZoneDraft({
		query,
		onQueryChange,
		onFilterApplied,
		onCleared,
		onClearAll,
	});

	return (
		<div className={styles.filterZone}>
			<div className={styles.searchRow}>
				{wrapControl(
					<div
						className={styles.searchInput}
						data-testid={`${testIdPrefix}-search-zone`}
					>
						<SearchBar
							value={draft}
							grammar={grammar}
							testIdPrefix={`${testIdPrefix}-list-search`}
							placeholder={placeholder}
							source={source}
							dirty={dirty}
							disabled={disabled}
							onChange={setDraft}
							onSubmit={run}
							onSubmitted={onSubmitted}
						/>
					</div>,
				)}
				{rightSlot}
			</div>
			{error && (
				<Typography.Text
					className={styles.error}
					testId={`${testIdPrefix}-query-error`}
				>
					{error}
				</Typography.Text>
			)}
			<div className={styles.filtersRow}>
				<Typography.Text className={styles.filtersLabel}>Filters</Typography.Text>
				{wrapControl(
					<div
						className={styles.filterControls}
						data-testid={`${testIdPrefix}-filter-zone`}
					>
						<FilterChips
							createdBy={reflected.createdBy}
							updated={reflected.updated}
							creatorOptions={creatorOptions}
							testIdPrefix={testIdPrefix}
							onCreatedByChange={handleCreatedByChange}
							onUpdatedChange={handleUpdatedChange}
							onApply={run}
							onClearCreatedBy={handleClearCreatedBy}
							disabled={disabled}
						/>
						{extraFilters}
						{(!isEmpty || hasExtraFilters) && (
							<Button
								disabledTooltip={undefined}
								variant="outlined"
								color="secondary"
								size="md"
								prefix={<X size={12} />}
								disabled={disabled}
								onClick={handleClear}
								testId={`${testIdPrefix}-filter-clear`}
							>
								Clear
							</Button>
						)}
					</div>,
				)}
			</div>
		</div>
	);
}

export default FilterZone;

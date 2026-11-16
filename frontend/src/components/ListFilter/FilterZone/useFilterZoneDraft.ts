import { useCallback, useEffect, useMemo, useState } from 'react';

import {
	clause,
	createdByClause,
	parseReflectedClauses,
	reflectedEqualityValue,
	type ReflectedClauses,
	spliceClause,
	updatedClause,
} from '../dsl/filterQuery';
import type { UpdatedWindow } from '../dsl/types';
import type { FilterAppliedPayload, FilterAppliedType } from '../types';

interface Args {
	query: string;
	onQueryChange: (value: string) => void;
	onFilterApplied?: (
		filterType: FilterAppliedType,
		payload: FilterAppliedPayload,
	) => void;
	onCleared?: () => void;
	onClearAll?: () => void;
}

interface FilterZoneDraft {
	draft: string;
	setDraft: (value: string) => void;
	reflected: ReflectedClauses;
	dirty: boolean;
	isEmpty: boolean;
	run: () => void;
	handleCreatedByChange: (emails: string[]) => void;
	handleUpdatedChange: (window: UpdatedWindow) => void;
	reflectedEnum: (key: string) => string | null;
	handleEnumChange: (key: string, value: string | null) => void;
	handleClearCreatedBy: () => void;
	handleClear: () => void;
}

// The query box is a DRAFT: typing and the Created-by / Updated dropdowns all edit
// the draft (dropdowns splice their clause in); nothing fetches until the draft is
// run. The draft re-syncs when the last-run query changes externally (view
// select, back/forward).
export function useFilterZoneDraft({
	query,
	onQueryChange,
	onFilterApplied,
	onCleared,
	onClearAll,
}: Args): FilterZoneDraft {
	const [draft, setDraft] = useState(query);

	useEffect(() => {
		setDraft(query);
	}, [query]);

	const reflected = useMemo(() => parseReflectedClauses(draft), [draft]);
	const dirty = draft.trim() !== query.trim();
	const isEmpty = !draft.trim();

	const commit = useCallback(
		(next: string): void => {
			const trimmed = next.trim();
			if (trimmed !== query) {
				onQueryChange(trimmed);
			}
		},
		[query, onQueryChange],
	);

	const run = useCallback((): void => commit(draft), [commit, draft]);

	// Created-by (multi-select) only STAGES its clause into the draft; the query runs
	// when the dropdown closes (FilterChips fires onApply), not on each pick.
	const handleCreatedByChange = useCallback(
		(emails: string[]): void => {
			onFilterApplied?.('createdBy', { valueCount: emails.length });
			setDraft((d) => spliceClause(d, 'created_by', createdByClause(emails)));
		},
		[onFilterApplied],
	);

	// Updated (single-select) is a definitive single choice, so it splices AND runs
	// immediately (with the fresh value, avoiding the async draft-state lag).
	const handleUpdatedChange = useCallback(
		(window: UpdatedWindow): void => {
			onFilterApplied?.('updatedWindow', {});
			const next = spliceClause(draft, 'updated_at', updatedClause(window));
			setDraft(next);
			commit(next);
		},
		[draft, commit, onFilterApplied],
	);

	const reflectedEnum = useCallback(
		(key: string): string | null => reflectedEqualityValue(draft, key),
		[draft],
	);

	// An enum chip is a single definitive choice like Updated: splice and run.
	const handleEnumChange = useCallback(
		(key: string, value: string | null): void => {
			const next = spliceClause(
				draft,
				key,
				value === null ? null : clause(key, '=', value),
			);
			setDraft(next);
			commit(next);
		},
		[draft, commit],
	);

	// Clear-all on the Created-by select removes its clause and runs immediately.
	const handleClearCreatedBy = useCallback((): void => {
		const next = spliceClause(draft, 'created_by', null);
		setDraft(next);
		commit(next);
	}, [draft, commit]);

	// Clear resets the draft and runs immediately (empty query).
	const handleClear = useCallback((): void => {
		onCleared?.();
		setDraft('');
		if (query !== '') {
			onQueryChange('');
		}
		onClearAll?.();
	}, [query, onQueryChange, onCleared, onClearAll]);

	return {
		draft,
		setDraft,
		reflected,
		dirty,
		isEmpty,
		run,
		handleCreatedByChange,
		handleUpdatedChange,
		reflectedEnum,
		handleEnumChange,
		handleClearCreatedBy,
		handleClear,
	};
}

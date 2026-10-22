import { create } from 'zustand';

/**
 * A dynamic dashboard variable reduced to what query-builder autocomplete needs:
 * `attribute` is the filter key it backs, `name` is the `$name` offered as a value.
 */
export interface DynamicVariableSuggestion {
	name: string;
	attribute: string;
}

interface DynamicVariableSuggestionsState {
	suggestions: DynamicVariableSuggestion[];
}

export const useDynamicVariableSuggestionsStore =
	create<DynamicVariableSuggestionsState>(() => ({
		suggestions: [],
	}));

export function setDynamicVariableSuggestions(
	suggestions: DynamicVariableSuggestion[],
): void {
	useDynamicVariableSuggestionsStore.setState({ suggestions });
}

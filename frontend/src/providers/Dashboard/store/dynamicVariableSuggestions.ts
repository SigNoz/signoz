import createStore from './store';

/**
 * A dynamic dashboard variable reduced to what query-builder autocomplete needs:
 * `attribute` is the filter key it backs, `name` is the `$name` offered as a value.
 */
export interface DynamicVariableSuggestion {
	name: string;
	attribute: string;
}

export const dynamicVariableSuggestionsStore = createStore<
	DynamicVariableSuggestion[]
>([]);

export function setDynamicVariableSuggestions(
	suggestions: DynamicVariableSuggestion[],
): void {
	dynamicVariableSuggestionsStore.set(() => suggestions);
}

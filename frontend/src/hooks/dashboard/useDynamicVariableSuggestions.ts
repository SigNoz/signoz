import {
	DynamicVariableSuggestion,
	useDynamicVariableSuggestionsStore,
} from 'providers/Dashboard/store/dynamicVariableSuggestions';

/**
 * Dynamic variables published by the dashboard currently open, so the query
 * builder can offer `$variable` as a value for the key each one backs. Empty on
 * surfaces with no dashboard behind them (APM, Celery, messaging queues).
 */
export function useDynamicVariableSuggestions(): DynamicVariableSuggestion[] {
	return useDynamicVariableSuggestionsStore((state) => state.suggestions);
}

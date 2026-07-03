import { useMemo, useState } from 'react';
import type {
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import useDebounce from 'hooks/useDebounce';

interface UseListColumnSuggestions {
	searchText: string;
	setSearchText: (value: string) => void;
	suggestions: TelemetrytypesTelemetryFieldKeyDTO[];
	/** Suggestion field keyed by name — enriches a freshly-picked column with its metadata. */
	suggestionByName: Map<string, TelemetrytypesTelemetryFieldKeyDTO>;
	isFetching: boolean;
}

/**
 * Server-side telemetry field-key search scoped to the panel's signal, shared by
 * the List columns editor's add-dropdown. Suggestions arrive grouped by name; we
 * flatten them and index by name so picks can carry their context/data-type.
 */
export function useListColumnSuggestions(
	signal: TelemetrytypesSignalDTO,
): UseListColumnSuggestions {
	const [searchText, setSearchText] = useState('');
	const debouncedSearch = useDebounce(searchText, 300);

	const { data, isFetching } = useGetFieldsKeys(
		{ signal, searchText: debouncedSearch },
		{ query: { enabled: !!signal } },
	);

	const suggestions = useMemo(
		() => Object.values(data?.data.keys ?? {}).flat(),
		[data],
	);
	const suggestionByName = useMemo(
		() => new Map(suggestions.map((field) => [field.name, field])),
		[suggestions],
	);

	return {
		searchText,
		setSearchText,
		suggestions,
		suggestionByName,
		isFetching,
	};
}

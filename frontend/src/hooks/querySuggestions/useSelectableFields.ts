import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { fetchFieldKeysForQuery } from 'components/QueryBuilderV2/QueryV2/QuerySearch/fieldSuggestions';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import {
	AI_O11Y_SELECTABLE_FIELDS_QUERY_KEY,
	mergeAIObservabilityStaticFields,
	StaticFieldsSource,
} from 'hooks/querySuggestions/staticFields';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

interface UseSelectableFieldsParams {
	signal: DataSource;
	searchText: string;
	/** Named pool to offer instead of the keys endpoint. */
	source?: StaticFieldsSource;
}

interface UseSelectableFields {
	fields: TelemetryFieldKey[];
	isLoading: boolean;
	/** True once a response has landed; unlike isLoading it is false before the first fetch. */
	isFetched: boolean;
}

/**
 * The fields the selector can offer. Without a source this is the keys endpoint,
 * narrowed on searchText; a named source reads the whole pool once instead.
 */
export function useSelectableFields({
	signal,
	searchText,
	source,
}: UseSelectableFieldsParams): UseSelectableFields {
	const isAIObservability = source === 'ai_o11y';

	const suggestions = useGetQueryKeySuggestions(
		{
			signal,
			searchText,
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_FIELDS_SELECTOR_SUGGESTIONS,
				signal,
				searchText,
			],
			enabled: !isAIObservability,
		},
	);

	// The per-trace aggregates are computed, so only this endpoint names them.
	const staticPool = useQuery({
		queryKey: AI_O11Y_SELECTABLE_FIELDS_QUERY_KEY,
		queryFn: async (): Promise<TelemetryFieldKey[]> => {
			const response = await fetchFieldKeysForQuery({
				builderQueryType: 'builder_ai_query',
				dataSource: DataSource.TRACES,
				searchText: '',
				fieldContext: TelemetrytypesFieldContextDTO.trace,
			});

			const aggregates = Object.values(response.data.data?.keys ?? {})
				.flat()
				.map(
					(key): TelemetryFieldKey => ({
						name: key.name,
						fieldContext: key.fieldContext as TelemetryFieldKey['fieldContext'],
						fieldDataType: key.fieldDataType as TelemetryFieldKey['fieldDataType'],
					}),
				);

			return mergeAIObservabilityStaticFields(aggregates);
		},
		enabled: isAIObservability,
	});

	const fields = useMemo(
		() =>
			isAIObservability
				? (staticPool.data ?? [])
				: (Object.values(
						suggestions.data?.data.data.keys || {},
					).flat() as TelemetryFieldKey[]),
		[isAIObservability, staticPool.data, suggestions.data],
	);

	return {
		fields,
		isLoading: isAIObservability ? staticPool.isFetching : suggestions.isFetching,
		isFetched: isAIObservability ? staticPool.isFetched : suggestions.isFetched,
	};
}
